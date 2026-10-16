import { getTeamWorkspace, runTeamCommand } from "@/server/team";
import { assertOrigin, failure, json, readJson } from "@/server/http";

type Context = { params: Promise<{ teamId: string }> };
export async function GET(_request: Request, context: Context) {
  try { return json(await getTeamWorkspace((await context.params).teamId)); } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    assertOrigin(request);
    return json(await runTeamCommand((await context.params).teamId, await readJson(request, 16_384)));
  } catch (error) { return failure(error); }
}
