/*
  POST /.netlify/functions/simli-stop-session

  Placeholder: in a real setup, notify Simli server to end the session.
*/
import type { Handler } from "@netlify/functions";
import { getUserFromRequest } from "./_lib/auth";

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const req = new Request(new URL(event.rawUrl), { method: "POST", headers: event.headers as any, body: event.body });
    const user = await getUserFromRequest(req);
    if (!user) return { statusCode: 401, body: "Unauthorized" };
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "Server error" };
  }
};


