/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { Client, Users, TablesDB, Query, Account } = require('node-appwrite');
try { process.loadEnvFile('.env'); } catch {}
try { process.loadEnvFile('.env.local'); } catch {}
const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) {
  console.error('Usage: node scripts/verify-live-accounts.cjs http://localhost:3113');
  process.exit(1);
}
const adminClient = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const admin = new Users(adminClient);
const tables = new TablesDB(adminClient);
const created = [];
const checks = [];
const cookieIds = new Map();
async function call(path, body, cookie, method = 'POST', actualOrigin = origin) {
  const response = await fetch(origin + path, { method, headers: { Origin: actualOrigin, ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(cookie ? {Cookie:cookie} : {}), ...(path.startsWith('/api/data') && cookieIds.has(cookie) ? {'X-Weekflow-Account':cookieIds.get(cookie)} : {}) }, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
  const data = await response.json();
  const nextCookie = response.headers.get('set-cookie')?.split(';')[0];
  if (nextCookie && data.user?.id) cookieIds.set(nextCookie,data.user.id);
  return {status:response.status,data,cookie:response.headers.get('set-cookie')?.split(';')[0],header:response.headers.get('set-cookie')};
}
async function signup(label) {
  const email = `weekflow-test-${randomUUID()}@example.invalid`;
  const password = `Test!${randomUUID()}`;
  const result = await call('/api/auth/sign-up', {name:`Weekflow test ${label}`,email,password});
  assert.equal(result.status,200,JSON.stringify(result.data));
  created.push(result.data.user.id);
  assert.match(result.header,/HttpOnly/i);
  return {email,password,cookie:result.cookie,id:result.data.user.id};
}
async function main() {
  const a = await signup('A'), b = await signup('B');
  checks.push('sign-up and HttpOnly session cookies');
  assert.equal((await call('/api/data',undefined,undefined,'GET')).status,401);
  assert.equal((await call('/api/auth/password',{},a.cookie,'POST','https://evil.invalid')).status,403);
  checks.push('anonymous access and cross-origin mutations denied');
  const initial = await call('/api/data',undefined,a.cookie,'GET');
  assert.equal(initial.status,200,JSON.stringify(initial.data));
  assert.deepEqual(initial.data.tasks.value,[]);
  assert.equal(initial.data.profile.value.email,a.email);
  const profile = {...initial.data.profile.value,bio:'Only account A can see this',avatarImage:'data:image/jpeg;base64,/9j/2Q=='};
  const save = await call('/api/data/profile',{revision:0,value:profile},a.cookie,'PUT');
  assert.equal(save.status,200,JSON.stringify(save.data));
  assert.equal((await call('/api/data',undefined,a.cookie,'GET')).data.profile.value.avatarImage,profile.avatarImage);
  assert.equal((await call('/api/data/profile',{revision:1,value:{...profile,avatarImage:'https://untrusted.invalid/photo.svg'}},a.cookie,'PUT')).status,400);
  const stale = await call('/api/data/profile',{revision:0,value:{...profile,bio:'stale overwrite'}},a.cookie,'PUT');
  assert.equal(stale.status,409,JSON.stringify(stale.data));
  const bData = await call('/api/data',undefined,b.cookie,'GET');
  assert.equal(bData.data.profile.value.bio,'');
  assert.equal(bData.data.profile.value.avatarImage ?? null,null);
  checks.push('avatar persists privately and arbitrary image URLs are rejected');
  assert.equal((await call('/api/data/profile',{revision:0,value:profile,ownerId:a.id},b.cookie,'PUT')).status,400);
  checks.push('empty new planner, account isolation, spoofed owner denied and stale writes rejected');
  const changedAccount=await fetch(origin+'/api/data/tasks',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json',Cookie:b.cookie,'X-Weekflow-Account':a.id},body:JSON.stringify({revision:0,value:[]})});
  assert.equal(changedAccount.status,409);
  checks.push('a stale tab cannot retarget its save to another signed-in account');
  const concurrent = await Promise.all([
    call('/api/data/profile',{revision:1,value:{...profile,bio:'parallel one'}},a.cookie,'PUT'),
    call('/api/data/profile',{revision:1,value:{...profile,bio:'parallel two'}},a.cookie,'PUT'),
  ]);
  assert.deepEqual(concurrent.map(result=>result.status).sort(),[200,409]);
  checks.push('concurrent saves commit one winner only');
  const recover = await new Account(adminClient).createRecovery({email:a.email,url:'https://weekflow-ashy.vercel.app/reset-password'});
  if (recover.secret) {
    const recoveredPassword=`Recovered!${randomUUID()}`;
    const reset=await call('/api/auth/reset',{userId:a.id,secret:recover.secret,password:recoveredPassword});
    assert.equal(reset.status,200,JSON.stringify(reset.data));
    a.password=recoveredPassword;
    const recoveredSession=await call('/api/auth/sign-in',{email:a.email,password:recoveredPassword});
    assert.equal(recoveredSession.status,200,JSON.stringify(recoveredSession.data));
    a.cookie=recoveredSession.cookie;
    checks.push('valid one-time recovery token accepted');
    assert.equal((await call('/api/auth/reset',{userId:a.id,secret:recover.secret,password:recoveredPassword})).status,401);
    checks.push('recovery token cannot be reused');
  } else checks.push('recovery token secret not available for automated positive check');
  const newPassword = `Changed!${randomUUID()}`;
  assert.equal((await call('/api/auth/password',{current:a.password,password:newPassword,confirm:newPassword},a.cookie)).status,200);
  assert.equal((await call('/api/auth/sign-in',{email:a.email,password:a.password})).status,401);
  const signin = await call('/api/auth/sign-in',{email:a.email,password:newPassword});
  assert.equal(signin.status,200,JSON.stringify(signin.data)); a.cookie=signin.cookie; a.password=newPassword;
  checks.push('password change and old-password rejection');
  assert.equal((await call('/api/auth/reset',{userId:a.id,secret:'invalid-test-token',password:newPassword})).status,401);
  assert.equal((await call('/api/auth/delete',{password:'wrong-password',confirm:'DELETE'},b.cookie)).status,401);
  checks.push('invalid recovery token and deletion without re-authentication rejected');
  assert.equal((await call('/api/auth/sign-out',{},a.cookie)).status,200);
  assert.equal((await call('/api/data',undefined,a.cookie,'GET')).status,401);
  checks.push('sign-out revokes access');
  assert.equal((await call('/api/data/profile',{revision:0,value:bData.data.profile.value},b.cookie,'PUT')).status,200);
  const pendingTx=await tables.createTransaction({ttl:60});
  const markerId=`state.${createHash('sha256').update(b.id).digest('hex').slice(0,30)}`;
  await tables.updateRow({databaseId:'weekflow',tableId:'account_data',rowId:markerId,transactionId:pendingTx.$id,data:{ownerId:'system:account-state'}});
  const taskRowId=createHash('sha256').update(`${b.id}:tasks`).digest('hex').slice(0,36);
  await tables.createRow({databaseId:'weekflow',tableId:'account_data',rowId:taskRowId,transactionId:pendingTx.$id,data:{ownerId:b.id,data:JSON.stringify({resource:'tasks',revision:1,value:[]})},permissions:[]});
  const deleted = await call('/api/auth/delete',{password:b.password,confirm:'DELETE'},b.cookie);
  assert.equal(deleted.status,200,JSON.stringify(deleted.data));
  await assert.rejects(tables.updateTransaction({transactionId:pendingTx.$id,commit:true}),error=>error.code===409);
  await tables.updateTransaction({transactionId:pendingTx.$id,rollback:true}).catch(()=>{});
  checks.push('deletion prevents an already-staged save from recreating private data');
  assert.equal((await call('/api/auth/sign-in',{email:b.email,password:b.password})).status,401);
  checks.push('permanent account deletion');
  console.log(JSON.stringify({passed:checks},null,2));
}
main().catch(error=>{console.error('Live account check failed:',error.message,'Completed checks:',checks.join('; '));process.exitCode=1;}).finally(async()=>{
  for(const userId of created) {
    try {
      const rows=await tables.listRows({databaseId:'weekflow',tableId:'account_data',queries:[Query.equal('ownerId',userId),Query.limit(100)]});
      for(const row of rows.rows) await tables.deleteRow({databaseId:'weekflow',tableId:'account_data',rowId:row.$id});
    } catch(error) { console.error('Test-data cleanup failed:',error.type||error.code);process.exitCode=1; }
    try { await admin.delete({userId}); } catch(error) { if(error.code!==404) {console.error('Test-user cleanup failed:',error.type || error.code);process.exitCode=1;} }
    try {
      const rowId=`state.${createHash('sha256').update(userId).digest('hex').slice(0,30)}`;
      await tables.deleteRow({databaseId:'weekflow',tableId:'account_data',rowId});
    } catch(error) { if(error.code!==404) {console.error('Test-marker cleanup failed:',error.type||error.code);process.exitCode=1;} }
  }
});
