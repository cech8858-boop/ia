import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  ASPECT_RATIOS,
  DURATIONS,
  RESOLUTIONS,
  estimatePriceUsd,
  formatUsd,
  type AspectRatio,
  type Duration,
  type Resolution,
} from "@/lib/eightscale";
import { generateTextToVideo, pollTextToVideo } from "@/lib/video.functions";
import { PayPalCheckout } from "@/components/PayPalCheckout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio Wan 2.2 — Génération vidéo par IA" },
      {
        name: "description",
        content:
          "Générez des vidéos MP4 à partir d'un prompt avec Wan 2.2 14B via l'API 8Scale : résolution, durée, coût estimé et téléchargement.",
      },
      { property: "og:title", content: "Studio Wan 2.2 — Génération vidéo par IA" },
      {
        property: "og:description",
        content:
          "Text-to-Video Wan 2.2 14B : prompt, résolution 480p/580p/720p, durée 3s ou 5s, coût estimé et lecteur intégré.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState<Resolution>("480p");
  const [seconds, setSeconds] = useState<Duration>(3);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const runGeneration = useServerFn(generateTextToVideo);
  const pollGeneration = useServerFn(pollTextToVideo);

  const mutation = useMutation({
    mutationFn: (input: {
      prompt: string;
      resolution: Resolution;
      seconds: Duration;
      aspect_ratio: AspectRatio;
    }) => runGeneration({ data: input }),
  });

  const price = estimatePriceUsd(resolution, seconds);
  const result = mutation.data;
  const requestId = result?.status === "queued" ? result.requestId : null;
  const polling = useQuery({
    queryKey: ["eightscale-video", requestId],
    queryFn: () => pollGeneration({ data: { requestId: requestId ?? "" } }),
    enabled: Boolean(requestId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" || query.state.data?.status === "error"
        ? false
        : 3000,
  });
  const isGenerating = mutation.isPending || (Boolean(requestId) && polling.data?.status !== "completed" && polling.data?.status !== "error");
  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : polling.error instanceof Error
        ? polling.error.message
        : polling.data?.status === "error"
          ? polling.data.message
      : result?.status === "error"
        ? result.message
        : null;
  const videoUrl =
    result?.status === "completed"
      ? result.videoUrl
      : polling.data?.status === "completed"
        ? polling.data.videoUrl
        : null;

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <header className="mb-10">
          <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            8Scale · Wan 2.2 14B
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Studio de génération vidéo
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Décrivez une scène, choisissez la résolution et la durée, puis lancez la génération.
            La clé API reste côté serveur.
          </p>
        </header>

        <section
          className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur sm:p-7"
          style={{ boxShadow: "var(--shadow-panel)" }}
        >
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!prompt.trim() || isGenerating) return;
              mutation.mutate({ prompt, resolution, seconds, aspect_ratio: aspectRatio });
            }}
          >
            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={4}
                placeholder="A cinematic mountain range at golden hour"
                className="w-full resize-y rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <OptionGroup
                label="Résolution"
                options={RESOLUTIONS}
                value={resolution}
                onChange={setResolution}
              />
              <OptionGroup
                label="Durée"
                options={DURATIONS}
                value={seconds}
                onChange={setSeconds}
                render={(value) => `${value}s`}
              />
              <OptionGroup
                label="Format"
                options={ASPECT_RATIOS}
                value={aspectRatio}
                onChange={setAspectRatio}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Coût estimé
                </p>
                <p className="text-2xl font-semibold text-primary">{formatUsd(price)}</p>
                <p className="text-xs text-muted-foreground">
                  {resolution} · {seconds}s — tarif officiel 8Scale
                </p>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {isGenerating ? "Génération en cours…" : "Générer la vidéo"}
              </button>
            </div>
          </form>
        </section>

        <div className="mt-8">
          <PayPalCheckout />
        </div>

        <section className="mt-8">
          {isGenerating && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-5 py-6">
              <span className="size-3 animate-ping rounded-full bg-primary" />
              <p className="text-sm text-muted-foreground">
                Génération en cours — cela peut prendre une à quelques minutes.
              </p>
            </div>
          )}

          {errorMessage && !isGenerating && (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-5 py-4">
              <p className="text-sm font-medium text-destructive-foreground">Erreur de l'API</p>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}

          {videoUrl && !isGenerating && (
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card/80"
              style={{ boxShadow: "var(--shadow-panel)" }}
            >
              <video src={videoUrl} controls playsInline className="w-full bg-black" />
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  {resolution} · {seconds}s · {aspectRatio}
                </p>
                <a
                  href={`/api/public/video-proxy?url=${encodeURIComponent(videoUrl)}`}
                  className="inline-flex items-center rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Télécharger la vidéo
                </a>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/image-to-video"
            className="rounded-2xl border border-dashed border-primary/50 bg-card/40 p-5 transition hover:border-primary hover:bg-card/60"
          >
            <p className="text-sm font-semibold">Image-to-Video</p>
            <p className="mt-1 font-mono text-xs text-primary">wan-2.2/14b/image-to-video</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Animer une image de départ avec un prompt de guidage.
            </p>
            <p className="mt-3 text-xs font-medium text-primary">Ouvrir le studio →</p>
          </Link>
          <Link
            to="/multi-scene"
            className="rounded-2xl border border-dashed border-primary/50 bg-card/40 p-5 transition hover:border-primary hover:bg-card/60"
          >
            <p className="text-sm font-semibold">Multi-Scene</p>
            <p className="mt-1 font-mono text-xs text-primary">wan-2.2/14b/multi-scene</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Jusqu'à 60s de vidéo continue à partir d'une séquence de prompts.
            </p>
            <p className="mt-3 text-xs font-medium text-primary">Ouvrir le studio →</p>
          </Link>
          <Link
            to="/ai-video-generator"
            className="rounded-2xl border border-dashed border-primary/50 bg-card/40 p-5 transition hover:border-primary hover:bg-card/60 sm:col-span-2"
          >
            <p className="text-sm font-semibold">AI Video Generator</p>
            <p className="mt-1 font-mono text-xs text-primary">apidot · kling · veo · sora</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Générer des vidéos avec Kling, Veo ou Sora, avec un système de crédits.
            </p>
            <p className="mt-3 text-xs font-medium text-primary">Ouvrir le studio →</p>
          </Link>
          <Link
            to="/apidot-media"
            className="rounded-2xl border border-dashed border-primary/50 bg-card/40 p-5 transition hover:border-primary hover:bg-card/60 sm:col-span-2"
          >
            <p className="text-sm font-semibold">APIDot Media Lab</p>
            <p className="mt-1 font-mono text-xs text-primary">nano-banana · elevenlabs</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Générer des images et des voix avec les modèles APIDot Nano Banana et ElevenLabs.
            </p>
            <p className="mt-3 text-xs font-medium text-primary">Ouvrir le studio →</p>
          </Link>
          <Link
            to="/character-swap"
            className="rounded-2xl border border-dashed border-primary/50 bg-card/40 p-5 transition hover:border-primary hover:bg-card/60 sm:col-span-2"
          >
            <p className="text-sm font-semibold">Character Swap</p>
            <p className="mt-1 font-mono text-xs text-primary">kling-2.6-motion-control</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Remplacer le personnage d'une vidéo tout en conservant ses mouvements.
            </p>
            <p className="mt-3 text-xs font-medium text-primary">Ouvrir le studio →</p>
          </Link>
        </section>
      </div>
    </main>
  );
}

function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render?: (value: T) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              option === value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background/50 text-muted-foreground hover:border-ring/60"
            }`}
          >
            {render ? render(option) : String(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
