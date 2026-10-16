import { inviteTeamMember } from "@/server/team";
import { assertOrigin, failure, json, readJson } from "@/server/http";

export async function POST(request: Request, context: { params: Promise<{ teamId: string }> }) {
  try {
    const origin = assertOrigin(request);
    return json(await inviteTeamMember((await context.params).teamId, await readJson(request, 4096), origin), 201);
  } catch (error) { return failure(error); }
}
