// Server-only 8Scale helpers. Never imported from client code.

const RUN_BASE = "https://8scale.run";

export type EightScaleCallResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export async function callEightScale(
  modelPath: string,
  payload: Record<string, unknown>,
): Promise<EightScaleCallResult> {
  const apiKey = process.env["EIGHTSCALE_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      body: { message: "EIGHTSCALE_API_KEY is not configured on the server." },
    };
  }

  const res = await fetch(`${RUN_BASE}/${modelPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }

  return { ok: res.ok, status: res.status, body };
}

export async function getEightScaleStatus(requestId: string): Promise<EightScaleCallResult> {
  const apiKey = process.env["EIGHTSCALE_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      body: { message: "EIGHTSCALE_API_KEY is not configured on the server." },
    };
  }

  const res = await fetch(`${RUN_BASE}/status/${encodeURIComponent(requestId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, body };
}

export function extractRequestId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)["requestId"];
  return typeof value === "string" && value ? value : null;
}

export function extractStatus(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)["status"];
  return typeof value === "string" ? value.toUpperCase() : null;
}

/** Best-effort extraction of an MP4 URL from an unknown provider response shape. */
export function extractVideoUrl(body: unknown): string | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (typeof node === "string") {
      return /^https?:\/\/\S+/.test(node) && /\.mp4|video/i.test(node) ? node : null;
    }
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    for (const value of Object.values(node as Record<string, unknown>)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(body);
}

export function errorMessageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        const nested = (value as Record<string, unknown>)["message"];
        if (typeof nested === "string") return nested;
      }
    }
  }
  if (typeof body === "string" && body.trim()) return body.slice(0, 500);
  return `8Scale request failed (HTTP ${status}).`;
}
