import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { pollCharacterSwap, submitCharacterSwap } from "@/lib/character-swap.functions";

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;

export const Route = createFileRoute("/character-swap")({
  head: () => ({
    meta: [
      { title: "Character Swap — Remplacer un personnage dans une vidéo" },
      {
        name: "description",
        content:
          "Remplacez le personnage d'une vidéo par celui de votre image tout en conservant les mouvements, grâce à Kling 2.6 Motion Control.",
      },
      { property: "og:title", content: "Character Swap — Remplacer un personnage dans une vidéo" },
      {
        property: "og:description",
        content:
          "Importez une image de personnage et une vidéo de mouvements : l'IA remplace le personnage en gardant poses et actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharacterSwapPage,
});

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}

function CharacterSwapPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);

  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const submit = useServerFn(submitCharacterSwap);
  const poll = useServerFn(pollCharacterSwap);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("Please upload an image.");
      if (!videoFile) throw new Error("Please upload a video.");

      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const imagePath = `uploads/${stamp}-image-${imageFile.name.replace(/[^\w.-]/g, "_")}`;
      const videoPath = `uploads/${stamp}-video-${videoFile.name.replace(/[^\w.-]/g, "_")}`;

      const [img, vid] = await Promise.all([
        supabase.storage.from("character-swap").upload(imagePath, imageFile, {
          contentType: imageFile.type,
          upsert: true,
        }),
        supabase.storage.from("character-swap").upload(videoPath, videoFile, {
          contentType: videoFile.type,
          upsert: true,
        }),
      ]);
      if (img.error || vid.error) throw new Error("Upload failed. Please try again.");

      return submit({ data: { imagePath, videoPath } });
    },
    onSuccess: (result) => {
      if (result.status === "queued") setTaskId(result.taskId);
      if (result.status === "completed") setFinalVideo(result.videoUrl);
    },
  });

  const polling = useQuery({
    queryKey: ["character-swap", taskId],
    queryFn: async () => {
      const result = await poll({ data: { taskId: taskId ?? "" } });
      if (result.status === "completed") setFinalVideo(result.videoUrl);
      return result;
    },
    enabled: Boolean(taskId) && !finalVideo,
    refetchInterval: (query) =>
      query.state.data?.status === "processing" || !query.state.data ? 5000 : false,
  });

  const isGenerating =
    !finalVideo && (mutation.isPending || (Boolean(taskId) && polling.data?.status !== "error"));

  const apiError =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.data?.status === "error"
        ? mutation.data.message
        : polling.data?.status === "error"
          ? polling.data.message
          : polling.error
            ? "Video generation failed. Please try again."
            : null;

  const errorMessage = localError ?? apiError;
  const canGenerate = Boolean(imageFile && videoFile) && !isGenerating;

  const reset = () => {
    setFinalVideo(null);
    setTaskId(null);
    setLocalError(null);
    mutation.reset();
  };

  async function onImageChange(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setLocalError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError("Image is too large (max 10 MB).");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onVideoChange(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) {
      setLocalError("Please upload an MP4, MOV or WEBM video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setLocalError("Video is too large (max 100 MB).");
      return;
    }
    const duration = await readVideoDuration(file);
    if (duration > MAX_VIDEO_SECONDS + 0.5) {
      setLocalError("Video must be 30 seconds or shorter.");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  return (
    <main
      className="min-h-screen bg-background text-foreground"
      style={{ backgroundImage: "var(--gradient-studio)" }}
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Character Swap</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Replace the character in a video with your own, keeping the original movements.
          </p>
        </header>

        {!finalVideo && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <UploadCard
                title="Upload Image"
                hint="Upload the character you want to use"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                inputRef={imageInput}
                fileName={imageFile?.name ?? null}
                onFile={onImageChange}
                preview={
                  imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Aperçu du personnage importé"
                      className="max-h-56 w-full rounded-xl object-contain"
                    />
                  ) : null
                }
              />
              <UploadCard
                title="Upload Video"
                hint="Upload the video with the movements"
                accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                inputRef={videoInput}
                fileName={videoFile?.name ?? null}
                onFile={onVideoChange}
                preview={
                  videoPreview ? (
                    <video
                      src={videoPreview}
                      controls
                      playsInline
                      className="max-h-56 w-full rounded-xl bg-black object-contain"
                    />
                  ) : null
                }
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => {
                  setLocalError(null);
                  mutation.mutate();
                }}
                className="inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {isGenerating && (
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {isGenerating ? "Generating..." : "Generate"}
              </button>

              {isGenerating && (
                <p className="text-sm text-muted-foreground">
                  This can take a few minutes. Keep this page open.
                </p>
              )}
            </div>
          </>
        )}

        {errorMessage && (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-destructive/50 bg-destructive/10 px-5 py-4 text-center">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        )}

        {finalVideo && (
          <div
            className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card/80"
            style={{ boxShadow: "var(--shadow-panel)" }}
          >
            <video src={finalVideo} controls playsInline className="w-full bg-black" />
            <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:justify-center">
              <a
                href={`/api/public/video-proxy?url=${encodeURIComponent(finalVideo)}`}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
              >
                Download Video
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground"
              >
                Generate Again
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function UploadCard({
  title,
  hint,
  accept,
  inputRef,
  fileName,
  preview,
  onFile,
}: {
  title: string;
  hint: string;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileName: string | null;
  preview: React.ReactNode;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <section
      className="flex flex-col rounded-2xl border border-border bg-card/80 p-6 backdrop-blur"
      style={{ boxShadow: "var(--shadow-panel)" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 p-6 text-center">
        {preview ?? (
          <p className="text-sm text-muted-foreground">No file selected</p>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 inline-flex items-center justify-center rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          {title}
        </button>
        <p className="text-xs text-muted-foreground">{hint}</p>
        {fileName && <p className="max-w-full truncate text-xs text-primary">{fileName}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </section>
  );
}
