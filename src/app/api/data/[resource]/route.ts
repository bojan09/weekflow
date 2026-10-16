import { resourceSchema } from "@/data/account-schema";
import { savePersonal } from "@/server/personal";
import { assertOrigin, failure, json, readJson } from "@/server/http";
export async function PUT(request: Request, context: { params: Promise<{ resource: string }> }) {
  try {
    assertOrigin(request);
    const resource = resourceSchema.parse((await context.params).resource);
    return json(await savePersonal(resource, await readJson(request), request.headers.get("X-Weekflow-Account")));
  } catch (error) { return failure(error); }
}
