/* ------------------------------------------------------------------ */
/* Shared Supabase RPC helper for the admin serverless functions.      */
/*                                                                     */
/* Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY                        */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function configured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/** Call a PostgREST RPC and return the parsed JSON body. */
export async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`supabase rpc ${fn} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

/** Read the Bearer token from an Authorization header. */
export function bearerToken(req: { headers: Record<string, string | string[] | undefined> }): string | null {
  const raw = req.headers["authorization"] ?? req.headers["Authorization"];
  if (typeof raw !== "string") return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1] : null;
}
