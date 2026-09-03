import { createFileRoute } from "@tanstack/react-router";

// Streams a generated video back through our origin so the browser can
// download it. Only known provider hosts are allowed (no open proxy).
const ALLOWED_HOST_SUFFIXES = [
  ".8scale.com",
  ".8scale.run",
  "8scale.com",
  "8scale.run",
  "apidot.ai",
  ".apidot.ai",
  "klingai.com",
  ".klingai.com",
  ".kling.ai",
  ".aliyuncs.com",
  ".amazonaws.com",
];

function isAllowed(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s)) ? url : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/video-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("url");
        if (!target) return new Response("Missing url", { status: 400 });
        const allowed = isAllowed(target);
        if (!allowed) return new Response("Host not allowed", { status: 403 });

        const upstream = await fetch(allowed.toString());
        if (!upstream.ok || !upstream.body) {
          return new Response("Upstream error", { status: 502 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "video/mp4",
            "Content-Disposition": 'attachment; filename="wan-2-2-video.mp4"',
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
