import { redirect } from "next/navigation";
// Private data loads after session validation.
export const instant = false;

export default function Page() { redirect("/app/home"); }
