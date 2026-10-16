import { beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => ({ createTeamWorkspace: vi.fn(), listTeamWorkspaces: vi.fn(), getTeamWorkspace: vi.fn(), runTeamCommand: vi.fn(), inviteTeamMember: vi.fn(), acceptTeamInvitation: vi.fn() }));
vi.mock("@/server/team", () => service);
import { GET, POST } from "./route";
import { POST as command } from "./[teamId]/route";
import { POST as invite } from "./[teamId]/invitations/route";
import { POST as accept } from "./accept-invitation/route";
import { HttpError } from "@/server/http";

const origin = "https://weekflow-ashy.vercel.app";
const context = { params: Promise.resolve({ teamId: "team1" }) };
const post = (path: string, body: unknown, from = origin) => new Request(`${origin}/api/team${path}`, { method: "POST", headers: { Origin: from, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("APP_URL", origin); });

describe("team HTTP boundary", () => {
  it("rejects cross-origin writes before invoking any team service", async () => {
    const handlers = [() => POST(post("", { name: "Bad" }, "https://other.example")), () => command(post("/team1", {}, "https://other.example"), context), () => invite(post("/team1/invitations", {}, "https://other.example"), context), () => accept(post("/accept-invitation", {}, "https://other.example"))];
    for (const handler of handlers) expect((await handler()).status).toBe(403);
    for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
  });
  it("does not return authentication failures as empty workspaces", async () => {
    service.listTeamWorkspaces.mockRejectedValueOnce(new HttpError(401, "Sign in to continue."));
    const result = await GET();
    expect(result.status).toBe(401);
    expect(await result.json()).toMatchObject({ message: "Sign in to continue." });
    expect(result.headers.get("cache-control")).toContain("no-store");
  });
  it("passes the validated origin to the invitation service and no actor argument", async () => {
    service.inviteTeamMember.mockResolvedValueOnce({ revision: 2 });
    const body = { revision: 1, email: "invitee@example.com", role: "member" };
    expect((await invite(post("/team1/invitations", body), context)).status).toBe(201);
    expect(service.inviteTeamMember).toHaveBeenCalledWith("team1", body, origin);
  });
  it("rejects malformed JSON before processing a command", async () => {
    const request = new Request(`${origin}/api/team/team1`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{" });
    expect((await command(request, context)).status).toBe(400);
    expect(service.runTeamCommand).not.toHaveBeenCalled();
  });
});
