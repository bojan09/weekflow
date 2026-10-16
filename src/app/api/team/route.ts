import { createTeamWorkspace, listTeamWorkspaces } from "@/server/team";
import { assertOrigin, failure, json, readJson } from "@/server/http";

export async function GET() {
  try { return json(await listTeamWorkspaces()); } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    return json(await createTeamWorkspace(await readJson(request, 4096)), 201);
  } catch (error) { return failure(error); }
}
