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
import { generateImageToVideo, pollImageToVideo } from "@/lib/video.functions";

export const Route = createFileRoute("/image-to-video")({
  head: () => ({
    meta: [
      { title: "Studio Wan 2.2 — Image-to-Video" },
      {
        name: "description",
        content:
          "Animez une image en vidéo MP4 avec Wan 2.2 14B Image-to-Video via l'API 8Scale : import d'image ou URL, résolution, durée et coût estimé.",
      },
      { property: "og:title", content: "Studio Wan 2.2 — Image-to-Video" },
      {
        property: "og:description",
        content:
          "Image-to-Video Wan 2.2 14B : image de départ, prompt de guidage, 480p/580p/720p, 3s ou 5s, lecteur intégré.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImageToVideoStudio,
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function ImageToVideoStudio() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<Resolution>("480p");
  const [seconds, setSeconds] = useState<Duration>(3);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const runGeneration = useServerFn(generateImageToVideo);
  const pollGeneration = useServerFn(pollImageToVideo);

  const mutation = useMutation({
    mutationFn: (input: {
      prompt: string;
      image: string;
      resolution: Resolution;
      seconds: Duration;
      aspect_ratio: AspectRatio;
    }) => runGeneration({ data: input }),
  });

  const price = estimatePriceUsd(resolution, seconds);
  const result = mutation.data;
  const requestId = result?.status === "queued" ? result.requestId : null;
  const polling = useQuery({
    queryKey: ["eightscale-i2v", requestId],
    queryFn: () => pollGeneration({ data: { requestId: requestId ?? "" } }),
    enabled: Boolean(requestId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" || query.state.data?.status === "error"
        ? false
        : 3000,
  });
  const isGenerating =
    mutation.isPending ||
    (Boolean(requestId) &&
      polling.data?.status !== "completed" &&
      polling.data?.status !== "error");
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

  function onFile(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("Le fichier doit être une image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("Image trop lourde (max 5 Mo). Utilisez plutôt une URL.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result ?? ""));
    reader.onerror = () => setFileError("Impossible de lire ce fichier.");
    reader.readAsDataURL(file);
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <header className="mb-10">
          <Link
            to="/"
            className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground transition hover:text-primary"
          >
            ← Retour au studio
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Image-to-Video
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Animez une image de départ avec un prompt de guidage. Modèle{" "}
            <span className="font-mono text-primary">wan-2.2/14b/image-to-video</span>.
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
              if (!image.trim() || isGenerating) return;
              mutation.mutate({
                prompt,
                image: image.trim(),
                resolution,
                seconds,
                aspect_ratio: aspectRatio,
              });
            }}
          >
            <div className="space-y-2">
              <label htmlFor="image-file" className="text-sm font-medium">
                Image de départ
              </label>
              <input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={(event) => onFile(event.target.files?.[0])}
                className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
              />
              <input
                type="url"
                value={image.startsWith("data:") ? "" : image}
                onChange={(event) => setImage(event.target.value)}
                placeholder="… ou collez une URL d'image (https://…)"
                className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
              {fileError && <p className="text-xs text-destructive">{fileError}</p>}
              {image && (
                <img
                  src={image}
                  alt="Aperçu de l'image de départ"
                  className="mt-2 max-h-52 rounded-xl border border-border object-contain"
                />
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                Prompt de guidage (optionnel)
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder="Slow cinematic dolly-in, gentle wind in the trees"
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
                disabled={!image.trim() || isGenerating}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {isGenerating ? "Génération en cours…" : "Animer l'image"}
              </button>
            </div>
          </form>
        </section>

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
