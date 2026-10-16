import { loadPersonal } from "@/server/personal";
import { failure, json } from "@/server/http";
export async function GET(request: Request) {
  try { return json(await loadPersonal(request.headers.get("X-Weekflow-Account"))); } catch (error) { return failure(error); }
}
