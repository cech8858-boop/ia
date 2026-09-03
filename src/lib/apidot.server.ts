// Server-only APIDot helpers. Never imported from client code.

const API_BASE = "https://api.apidot.ai/api/generate";

export const APIDOT_MODEL_IDS = {
  nanoBanana: "nano-banana",
  elevenLabs: "elevenlabs",
} as const;

export type ApiDotResult = { ok: boolean; status: number; body: unknown };

function apiKey(): string | null {
  const key = process.env["APIDOT_API_KEY"];
  return key && key.trim() ? key.trim() : null;
}

async function parse(res: Response): Promise<ApiDotResult> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, body };
}

export async function submitMotionControl(payload: {
  image: string;
  video: string;
}): Promise<ApiDotResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 500, body: { message: "API key is not configured." } };
  }

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "kling-2.6-motion-control",
      input: {
        image: payload.image,
        video: payload.video,
        character_orientation: "video",
        resolution: "720p",
      },
    }),
  });

  return parse(res);
}

export async function submitNanoBanana(
  input: Record<string, unknown>,
  modelId: string = APIDOT_MODEL_IDS.nanoBanana,
): Promise<ApiDotResult> {
  return submitGeneration(modelId, input);
}

export async function submitElevenLabs(
  input: Record<string, unknown>,
  modelId: string = APIDOT_MODEL_IDS.elevenLabs,
): Promise<ApiDotResult> {
  return submitGeneration(modelId, input);
}

/** Generic APIDot submit for any documented model id. */
export async function submitGeneration(
  model: string,
  input: Record<string, unknown>,
): Promise<ApiDotResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 500, body: { message: "API key is not configured." } };
  }

  const res = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  return parse(res);
}

export async function getTaskStatus(taskId: string): Promise<ApiDotResult> {
  const key = apiKey();
  if (!key) {
    return { ok: false, status: 500, body: { message: "API key is not configured." } };
  }

  const res = await fetch(`${API_BASE}/status/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  return parse(res);
}

export async function getMotionControlStatus(taskId: string): Promise<ApiDotResult> {
  return getTaskStatus(taskId);
}

function deepFind(body: unknown, keys: string[], test: (value: string) => boolean): string | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    const record = node as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && test(value)) return value;
    }
    for (const value of Object.values(record)) {
      const found = walk(value);
      if (found) return found;
    }
    return null;
  };
  return walk(body);
}

export function extractTaskId(body: unknown): string | null {
  return deepFind(body, ["task_id", "taskId", "id"], (value) => value.length > 0);
}

export function extractTaskStatus(body: unknown): string | null {
  const value = deepFind(body, ["status", "state", "task_status"], (v) => v.length > 0);
  return value ? value.toLowerCase() : null;
}

export function extractResultVideoUrl(body: unknown): string | null {
  const direct = deepFind(
    body,
    ["video_url", "videoUrl", "output_url", "url", "resultUrl", "result_url"],
    (value) => /^https?:\/\//.test(value),
  );
  if (direct) return direct;

  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (typeof node === "string") {
      return /^https?:\/\/\S+/.test(node) && /\.(mp4|mov|webm)(\?|$)/i.test(node) ? node : null;
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

export function extractResultImageUrl(body: unknown): string | null {
  const direct = deepFind(
    body,
    ["image_url", "imageUrl", "output_url", "result_url", "url", "image"],
    (value) => /^https?:\/\//.test(value),
  );
  if (direct) return direct;

  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (typeof node === "string") {
      return /^https?:\/\/\S+/.test(node) && /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(node) ? node : null;
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

export function extractResultAudioUrl(body: unknown): string | null {
  const direct = deepFind(
    body,
    ["audio_url", "audioUrl", "output_url", "result_url", "url", "audio"],
    (value) => /^https?:\/\//.test(value),
  );
  if (direct) return direct;

  const seen = new Set<unknown>();
  const walk = (node: unknown): string | null => {
    if (typeof node === "string") {
      return /^https?:\/\/\S+/.test(node) && /\.(mp3|wav|aac|ogg|m4a)(\?|$)/i.test(node) ? node : null;
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

export function extractMediaUrl(
  body: unknown,
  preferredTypes: string[] = [],
): string | null {
  const urls: Array<{ url: string; score: number }> = [];
  const seen = new Set<unknown>();

  const walk = (node: unknown, parentKey = "") => {
    if (typeof node === "string") {
      if (/^https?:\/\//i.test(node)) {
        const lower = `${parentKey} ${node}`.toLowerCase();
        const score = preferredTypes.reduce(
          (total, type) => total + (lower.includes(type.toLowerCase()) ? 10 : 0),
          0,
        );
        urls.push({ url: node, score });
      }
      return;
    }

    if (!node || typeof node !== "object" || seen.has(node)) {
      return;
    }

    seen.add(node);

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      walk(value, key);
    }
  };

  walk(body);
  urls.sort((a, b) => b.score - a.score);
  return urls[0]?.url ?? null;
}

/** Safe, non-sensitive error message for the UI. */
export function safeErrorMessage(body: unknown): string | null {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "error_message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.slice(0, 300);
      if (value && typeof value === "object") {
        const nested = (value as Record<string, unknown>)["message"];
        if (typeof nested === "string" && nested.trim()) return nested.slice(0, 300);
      }
    }
  }
  return null;
}
