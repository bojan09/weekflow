import { acceptTeamInvitation } from "@/server/team";
import { assertOrigin, failure, json, readJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    return json(await acceptTeamInvitation(await readJson(request, 4096)));
  } catch (error) { return failure(error); }
}
