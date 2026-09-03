import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  generateElevenLabs,
  generateNanoBanana,
  pollElevenLabs,
  pollNanoBanana,
} from "@/lib/apidot-media.functions";

export const Route = createFileRoute("/apidot-media")({
  head: () => ({
    meta: [
      { title: "APIDot Media Lab" },
      { name: "description", content: "Nano Banana and ElevenLabs via APIDot" },
    ],
  }),
  component: ApiDotMediaLab,
});

function ApiDotMediaLab() {
  const [tab, setTab] = useState<"nano-banana" | "elevenlabs">("nano-banana");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("Hello world, this is a test from APIDot.");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nanoJobId, setNanoJobId] = useState<string | null>(null);
  const [elevenJobId, setElevenJobId] = useState<string | null>(null);

  const runNano = useServerFn(generateNanoBanana);
  const pollNano = useServerFn(pollNanoBanana);
  const runEleven = useServerFn(generateElevenLabs);
  const pollEleven = useServerFn(pollElevenLabs);

  const nanoMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await runNano({ data: { prompt } });
      if (result.status === "error") throw new Error(result.message);
      if (result.status === "processing") setNanoJobId(result.generationId);
      if (result.status === "completed") setImageUrl(result.imageUrl);
      return result;
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Nano Banana failed."),
  });

  const elevenMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await runEleven({ data: { text } });
      if (result.status === "error") throw new Error(result.message);
      if (result.status === "processing") setElevenJobId(result.generationId);
      if (result.status === "completed") setAudioUrl(result.audioUrl);
      return result;
    },
    onError: (err) => setError(err instanceof Error ? err.message : "ElevenLabs failed."),
  });

  const nanoPolling = useQuery({
    queryKey: ["apidot-nano", nanoJobId],
    queryFn: () => pollNano({ data: { generationId: nanoJobId! } }),
    enabled: tab === "nano-banana" && Boolean(nanoJobId),
    refetchInterval: 5000,
  });

  const elevenPolling = useQuery({
    queryKey: ["apidot-eleven", elevenJobId],
    queryFn: () => pollEleven({ data: { generationId: elevenJobId! } }),
    enabled: tab === "elevenlabs" && Boolean(elevenJobId),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (tab === "nano-banana" && nanoPolling.data?.status === "completed") {
      setImageUrl(nanoPolling.data.imageUrl);
      setNanoJobId(null);
    }
    if (tab === "nano-banana" && nanoPolling.data?.status === "error") {
      setError(nanoPolling.data.message);
      setNanoJobId(null);
    }

    if (tab === "elevenlabs" && elevenPolling.data?.status === "completed") {
      setAudioUrl(elevenPolling.data.audioUrl);
      setElevenJobId(null);
    }
    if (tab === "elevenlabs" && elevenPolling.data?.status === "error") {
      setError(elevenPolling.data.message);
      setElevenJobId(null);
    }
  }, [tab, nanoPolling.data, elevenPolling.data]);

  const isGenerating =
    (tab === "nano-banana" && (nanoMutation.isPending || (Boolean(nanoJobId) && nanoPolling.data?.status === "processing"))) ||
    (tab === "elevenlabs" && (elevenMutation.isPending || (Boolean(elevenJobId) && elevenPolling.data?.status === "processing")));

  const currentError =
    error ||
    (tab === "nano-banana" && nanoMutation.error instanceof Error ? nanoMutation.error.message : null) ||
    (tab === "elevenlabs" && elevenMutation.error instanceof Error ? elevenMutation.error.message : null) ||
    (tab === "nano-banana" && nanoPolling.data?.status === "error" ? nanoPolling.data.message : null) ||
    (tab === "elevenlabs" && elevenPolling.data?.status === "error" ? elevenPolling.data.message : null);

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">APIDot Media Lab</p>
          <h1 className="mt-3 text-3xl font-semibold">Nano Banana + ElevenLabs</h1>
        </header>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTab("nano-banana")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === "nano-banana" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Nano Banana
          </button>
          <button
            type="button"
            onClick={() => setTab("elevenlabs")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === "elevenlabs" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            ElevenLabs
          </button>
        </div>

        {tab === "nano-banana" ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              placeholder="A cinematic portrait of a fox in the snow with warm sunset light"
            />
            <button
              type="button"
              disabled={!prompt.trim() || isGenerating}
              onClick={() => {
                setError(null);
                setImageUrl(null);
                setNanoJobId(null);
                nanoMutation.mutate();
              }}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate image"}
            </button>

            {imageUrl && (
              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <img src={imageUrl} alt="Nano Banana result" className="w-full object-cover" />
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="mb-2 block text-sm font-medium">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              placeholder="Write the text you want to hear in voice"
            />
            <button
              type="button"
              disabled={!text.trim() || isGenerating}
              onClick={() => {
                setError(null);
                setAudioUrl(null);
                setElevenJobId(null);
                elevenMutation.mutate();
              }}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {isGenerating ? "Generating…" : "Generate audio"}
            </button>

            {audioUrl && (
              <div className="mt-6 overflow-hidden rounded-xl border border-border">
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}
          </section>
        )}

        {currentError && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive-foreground">
            {currentError}
          </div>
        )}
      </div>
    </main>
  );
}
