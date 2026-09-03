import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { FAMILY_LABELS, FAMILY_ORDER, MODE_LABELS, type VideoMode, type VideoModelRow } from "@/lib/ai-video";
import { createVideoGeneration, getMyCredits, pollVideoGeneration } from "@/lib/ai-video.functions";

export const Route = createFileRoute("/ai-video-generator")({
  head: () => ({
    meta: [
      { title: "AI Video Generator — Kling, Veo & Sora" },
      {
        name: "description",
        content:
          "Générez des vidéos IA avec Kling, Veo et Sora via APIDot : text-to-video, image-to-video, durée, résolution et coût en crédits.",
      },
      { property: "og:title", content: "AI Video Generator — Kling, Veo & Sora" },
      {
        property: "og:description",
        content:
          "Studio unifié APIDot : choisissez un modèle, un mode, une durée et générez votre vidéo en quelques minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiVideoGenerator,
});

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function AiVideoGenerator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [family, setFamily] = useState<string>("kling");
  const [mode, setMode] = useState<VideoMode>("image_to_video");
  const [duration, setDuration] = useState<number | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "uploading" | "processing" | "completed">("idle");
  const [uiError, setUiError] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const runCreate = useServerFn(createVideoGeneration);
  const runPoll = useServerFn(pollVideoGeneration);
  const runCredits = useServerFn(getMyCredits);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthChecked(true);
      if (!data.session) navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const modelsQuery = useQuery({
    queryKey: ["video-models"],
    queryFn: async (): Promise<VideoModelRow[]> => {
      const { data, error } = await supabase
        .from("video_models")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VideoModelRow[];
    },
  });

  const creditsQuery = useQuery({
    queryKey: ["my-credits", userId],
    queryFn: () => runCredits({}),
    enabled: Boolean(userId),
  });

  const models = useMemo(() => modelsQuery.data ?? [], [modelsQuery.data]);
  const families = useMemo(() => {
    const present = Array.from(new Set(models.map((m) => m.family)));
    return FAMILY_ORDER.filter((f) => present.includes(f)).concat(
      present.filter((f) => !FAMILY_ORDER.includes(f)),
    );
  }, [models]);

  const familyModels = useMemo(() => models.filter((m) => m.family === family), [models, family]);
  const availableModes = useMemo(
    () => Array.from(new Set(familyModels.map((m) => m.mode))) as VideoMode[],
    [familyModels],
  );
  const modeModels = useMemo(
    () => familyModels.filter((m) => m.mode === mode),
    [familyModels, mode],
  );
  const resolutions = useMemo(
    () => Array.from(new Set(modeModels.map((m) => m.resolution).filter(Boolean))) as string[],
    [modeModels],
  );
  const durations = useMemo(
    () =>
      Array.from(
        new Set(
          modeModels
            .filter((m) => (resolution ? m.resolution === resolution : true))
            .map((m) => m.duration),
        ),
      ).sort((a, b) => a - b),
    [modeModels, resolution],
  );

  const selected = useMemo(
    () =>
      modeModels.find(
        (m) => m.duration === duration && (m.resolution ?? null) === (resolution ?? null),
      ) ?? null,
    [modeModels, duration, resolution],
  );

  useEffect(() => {
    if (families.length && !families.includes(family)) setFamily(families[0]!);
  }, [families, family]);

  useEffect(() => {
    if (availableModes.length && !availableModes.includes(mode)) setMode(availableModes[0]!);
  }, [availableModes, mode]);

  useEffect(() => {
    setResolution((current) =>
      resolutions.length === 0 ? null : current && resolutions.includes(current) ? current : resolutions[0]!,
    );
  }, [resolutions]);

  useEffect(() => {
    setDuration((current) =>
      durations.length === 0 ? null : current && durations.includes(current) ? current : durations[0]!,
    );
  }, [durations]);

  useEffect(() => {
    const options = selected?.aspect_ratios ?? ["16:9"];
    if (!options.includes(aspectRatio)) setAspectRatio(options[0]!);
  }, [selected, aspectRatio]);

  const balance = creditsQuery.data?.balance ?? 0;
  const cost = selected?.credits_required ?? 0;
  const notEnoughCredits = Boolean(selected) && balance < cost;

  const polling = useQuery({
    queryKey: ["ai-video-generation", generationId],
    queryFn: () => runPoll({ data: { generationId: generationId! } }),
    enabled: Boolean(generationId) && phase === "processing",
    refetchInterval: 5000,
  });

  useEffect(() => {
    const result = polling.data;
    if (!result) return;
    if (result.status === "completed") {
      setVideoUrl(result.videoUrl);
      setPhase("completed");
      setGenerationId(null);
      queryClient.invalidateQueries({ queryKey: ["my-credits", userId] });
    } else if (result.status === "error") {
      setUiError(result.message);
      setPhase("idle");
      setGenerationId(null);
      queryClient.invalidateQueries({ queryKey: ["my-credits", userId] });
    }
  }, [polling.data, queryClient, userId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId || !selected) throw new Error("This configuration is not available.");
      setUiError(null);

      let imagePath: string | null = null;
      if (mode === "image_to_video") {
        if (!imageFile) throw new Error("Please upload an image.");
        setPhase("uploading");
        const ext = imageFile.name.split(".").pop() ?? "png";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("video-inputs")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (error) throw new Error("Upload failed. Please try again.");
        imagePath = path;
      }

      setPhase("processing");
      return runCreate({
        data: {
          family,
          mode,
          duration: selected.duration,
          resolution: selected.resolution,
          aspectRatio,
          prompt,
          imagePath,
        },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-credits", userId] });
      if (result.status === "completed") {
        setVideoUrl(result.videoUrl);
        setPhase("completed");
      } else if (result.status === "processing") {
        setGenerationId(result.generationId);
      } else {
        setUiError(result.message);
        setPhase("idle");
      }
    },
    onError: (error) => {
      setUiError(error instanceof Error ? error.message : "Video generation failed. Please try again.");
      setPhase("idle");
    },
  });

  const busy = phase === "uploading" || phase === "processing";

  function onPickImage(file: File | null) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setUiError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUiError("Image must be under 10 MB.");
      return;
    }
    setUiError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function resetGeneration() {
    setVideoUrl(null);
    setPhase("idle");
    setUiError(null);
  }

  if (!authChecked || !userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Chargement…</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              APIDot · Kling · Veo · Sora
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              AI Video Generator
            </h1>
          </div>
          <div className="rounded-xl border border-border bg-card/70 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Crédits</p>
            <p className="text-xl font-semibold text-primary">{balance}</p>
          </div>
        </header>

        <section
          className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur sm:p-7"
          style={{ boxShadow: "var(--shadow-panel)" }}
        >
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy || !selected || notEnoughCredits || !prompt.trim()) return;
              mutation.mutate();
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Choices
                label="Model"
                options={families}
                value={family}
                onChange={setFamily}
                render={(f) => FAMILY_LABELS[f] ?? f}
              />
              <Choices
                label="Generation Mode"
                options={availableModes}
                value={mode}
                onChange={setMode}
                render={(m) => MODE_LABELS[m]}
              />
            </div>

            {mode === "image_to_video" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Upload Image</p>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => onPickImage(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Aperçu de l'image de départ"
                    className="max-h-56 rounded-xl border border-border object-contain"
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">
                Prompt
              </label>
              <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="A cinematic tracking shot through a neon-lit street at night"
                className="w-full resize-y rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {durations.length > 1 && (
                <Choices
                  label="Durée"
                  options={durations}
                  value={duration ?? durations[0]!}
                  onChange={setDuration}
                  render={(d) => `${d}s`}
                />
              )}
              {resolutions.length > 1 && (
                <Choices
                  label="Résolution"
                  options={resolutions}
                  value={resolution ?? resolutions[0]!}
                  onChange={setResolution}
                />
              )}
              {(selected?.aspect_ratios.length ?? 0) > 1 && (
                <Choices
                  label="Format"
                  options={selected!.aspect_ratios}
                  value={aspectRatio}
                  onChange={setAspectRatio}
                />
              )}
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Coût estimé
                </p>
                <p className="text-2xl font-semibold text-primary">{cost} crédits</p>
                <p className="text-xs text-muted-foreground">
                  {selected ? `${selected.label} · ${selected.duration}s` : "Configuration indisponible"}
                  {notEnoughCredits ? " — crédits insuffisants" : ""}
                </p>
              </div>
              <button
                type="submit"
                disabled={busy || !selected || notEnoughCredits || !prompt.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {busy ? "Generating..." : "Generate Video"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 space-y-4">
          {busy && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-5 py-6">
              <span className="size-3 animate-ping rounded-full bg-primary" />
              <p className="text-sm text-muted-foreground">
                {phase === "uploading" ? "Uploading…" : "Processing…"}
              </p>
            </div>
          )}

          {uiError && !busy && (
            <div className="rounded-2xl border border-destructive/50 bg-destructive/10 px-5 py-4">
              <p className="text-sm font-medium text-destructive-foreground">Erreur</p>
              <p className="mt-1 text-sm text-muted-foreground">{uiError}</p>
            </div>
          )}

          {videoUrl && !busy && (
            <div
              className="overflow-hidden rounded-2xl border border-border bg-card/80"
              style={{ boxShadow: "var(--shadow-panel)" }}
            >
              <video src={videoUrl} controls playsInline className="w-full bg-black" />
              <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                <a
                  href={`/api/public/video-proxy?url=${encodeURIComponent(videoUrl)}`}
                  className="inline-flex items-center rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  Download Video
                </a>
                <button
                  type="button"
                  onClick={resetGeneration}
                  className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Generate Again
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="mt-10">
          <Link to="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            ← Retour au studio
          </Link>
        </div>
      </div>
    </main>
  );
}

function Choices<T extends string | number>({
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
