import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  ASPECT_RATIOS,
  MULTI_SCENE_DURATIONS,
  RESOLUTIONS,
  estimateMultiScenePriceUsd,
  formatUsd,
  type AspectRatio,
  type MultiSceneDuration,
  type Resolution,
} from "@/lib/eightscale";
import { generateMultiScene, pollMultiScene } from "@/lib/video.functions";

export const Route = createFileRoute("/multi-scene")({
  head: () => ({
    meta: [
      { title: "Studio Wan 2.2 — Multi-Scene (jusqu'à 60s)" },
      {
        name: "description",
        content:
          "Générez une vidéo narrative de plusieurs scènes avec Wan 2.2 14B Multi-Scene via l'API 8Scale : jusqu'à 60 secondes à partir d'une séquence de prompts.",
      },
      {
        property: "og:title",
        content: "Studio Wan 2.2 — Multi-Scene (jusqu'à 60s)",
      },
      {
        property: "og:description",
        content:
          "Multi-Scene Wan 2.2 14B : plusieurs prompts, résolution 480p/580p/720p, durée 10s à 60s, lecteur intégré.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MultiSceneStudio,
});

const MIN_SCENES = 2;
const MAX_SCENES = 6;

function MultiSceneStudio() {
  const [scenes, setScenes] = useState<string[]>(["", ""]);
  const [resolution, setResolution] = useState<Resolution>("480p");
  const [seconds, setSeconds] = useState<MultiSceneDuration>(60);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");

  const runGeneration = useServerFn(generateMultiScene);
  const pollGeneration = useServerFn(pollMultiScene);

  const mutation = useMutation({
    mutationFn: (input: {
      prompts: string[];
      resolution: Resolution;
      seconds: MultiSceneDuration;
      aspect_ratio: AspectRatio;
    }) => runGeneration({ data: input }),
  });

  const price = estimateMultiScenePriceUsd();
  const result = mutation.data;
  const requestId = result?.status === "queued" ? result.requestId : null;
  const polling = useQuery({
    queryKey: ["eightscale-multi-scene", requestId],
    queryFn: () => pollGeneration({ data: { requestId: requestId ?? "" } }),
    enabled: Boolean(requestId),
    refetchInterval: (query) =>
      query.state.data?.status === "completed" || query.state.data?.status === "error"
        ? false
        : 4000,
  });
  const isGenerating =
    mutation.isPending ||
    (Boolean(requestId) && polling.data?.status !== "completed" && polling.data?.status !== "error");
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

  const canSubmit =
    !isGenerating && scenes.every((s) => s.trim().length > 0) && scenes.length >= MIN_SCENES;

  function addScene() {
    setScenes((prev) => (prev.length < MAX_SCENES ? [...prev, ""] : prev));
  }

  function removeScene(index: number) {
    setScenes((prev) => {
      if (prev.length <= MIN_SCENES) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  function updateScene(index: number, value: string) {
    setScenes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              8Scale · Wan 2.2 14B
            </span>
            <Link
              to="/"
              className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              ← Text-to-Video
            </Link>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Studio Multi-Scene
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Décrivez chaque plan de la narration. 8Scale enchaîne les clips pour produire une vidéo
            continue jusqu'à 60 secondes.
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
              if (!canSubmit) return;
              mutation.mutate({
                prompts: scenes.map((s) => s.trim()),
                resolution,
                seconds,
                aspect_ratio: aspectRatio,
              });
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Scènes ({scenes.length})</label>
                <button
                  type="button"
                  onClick={addScene}
                  disabled={scenes.length >= MAX_SCENES}
                  className="inline-flex items-center rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Ajouter une scène
                </button>
              </div>
              {scenes.map((scene, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`scene-${index}`} className="text-xs text-muted-foreground">
                      Scène {index + 1}
                    </label>
                    {scenes.length > MIN_SCENES && (
                      <button
                        type="button"
                        onClick={() => removeScene(index)}
                        className="text-xs text-destructive-foreground/80 transition hover:text-destructive-foreground"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  <textarea
                    id={`scene-${index}`}
                    value={scene}
                    onChange={(event) => updateScene(index, event.target.value)}
                    rows={3}
                    placeholder={`Description de la scène ${index + 1}`}
                    className="w-full resize-y rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <OptionGroup
                label="Résolution"
                options={RESOLUTIONS}
                value={resolution}
                onChange={setResolution}
              />
              <OptionGroup
                label="Durée totale"
                options={MULTI_SCENE_DURATIONS}
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
                  Tarif Multi-Scene fourni par 8Scale après génération.
                </p>
              </div>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {isGenerating ? "Génération en cours…" : "Générer la vidéo"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          {isGenerating && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-5 py-6">
              <span className="size-3 animate-ping rounded-full bg-primary" />
              <p className="text-sm text-muted-foreground">
                Génération Multi-Scene en cours — plusieurs clips sont assemblés, cela peut prendre
                quelques minutes.
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
                  {resolution} · {seconds}s · {aspectRatio} · {scenes.length} scènes
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
