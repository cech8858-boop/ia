import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  generateElevenLabs,
  generateElevenLabsMusic,
  generateMeshy,
  generateNanoBanana,
  generateTripo3d,
  pollElevenLabs,
  pollElevenLabsMusic,
  pollMeshy,
  pollNanoBanana,
  pollTripo3d,
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
  const [tab, setTab] = useState<"nano-banana" | "elevenlabs" | "elevenlabs-music" | "tripo3d" | "meshy">("nano-banana");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("Hello world, this is a test from APIDot.");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [modelPrompt, setModelPrompt] = useState("");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [meshyPrompt, setMeshyPrompt] = useState("");
  const [meshyUrl, setMeshyUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nanoJobId, setNanoJobId] = useState<string | null>(null);
  const [elevenJobId, setElevenJobId] = useState<string | null>(null);
  const [musicJobId, setMusicJobId] = useState<string | null>(null);
  const [modelJobId, setModelJobId] = useState<string | null>(null);
  const [meshyJobId, setMeshyJobId] = useState<string | null>(null);

  const runNano = useServerFn(generateNanoBanana);
  const pollNano = useServerFn(pollNanoBanana);
  const runEleven = useServerFn(generateElevenLabs);
  const pollEleven = useServerFn(pollElevenLabs);
  const runMusic = useServerFn(generateElevenLabsMusic);
  const pollMusic = useServerFn(pollElevenLabsMusic);
  const runTripo = useServerFn(generateTripo3d);
  const pollTripo = useServerFn(pollTripo3d);
  const runMeshy = useServerFn(generateMeshy);
  const pollMeshyJob = useServerFn(pollMeshy);

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

  const musicMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await runMusic({ data: { prompt: musicPrompt } });
      if (result.status === "error") throw new Error(result.message);
      if (result.status === "processing") setMusicJobId(result.generationId);
      if (result.status === "completed") setMusicUrl(result.audioUrl);
      return result;
    },
    onError: (err) => setError(err instanceof Error ? err.message : "ElevenLabs Music failed."),
  });

  const tripoMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await runTripo({ data: { prompt: modelPrompt } });
      if (result.status === "error") throw new Error(result.message);
      if (result.status === "processing") setModelJobId(result.generationId);
      if (result.status === "completed") setModelUrl(result.modelUrl);
      return result;
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Tripo3D failed."),
  });

  const meshyMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const result = await runMeshy({ data: { prompt: meshyPrompt } });
      if (result.status === "error") throw new Error(result.message);
      if (result.status === "processing") setMeshyJobId(result.generationId);
      if (result.status === "completed") setMeshyUrl(result.modelUrl);
      return result;
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Meshy failed."),
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

  const musicPolling = useQuery({
    queryKey: ["apidot-elevenlabs-music", musicJobId],
    queryFn: () => pollMusic({ data: { generationId: musicJobId! } }),
    enabled: tab === "elevenlabs-music" && Boolean(musicJobId),
    refetchInterval: 5000,
  });

  const tripoPolling = useQuery({
    queryKey: ["apidot-tripo3d", modelJobId],
    queryFn: () => pollTripo({ data: { generationId: modelJobId! } }),
    enabled: tab === "tripo3d" && Boolean(modelJobId),
    refetchInterval: 5000,
  });

  const meshyPolling = useQuery({
    queryKey: ["apidot-meshy", meshyJobId],
    queryFn: () => pollMeshyJob({ data: { generationId: meshyJobId! } }),
    enabled: tab === "meshy" && Boolean(meshyJobId),
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
    if (tab === "elevenlabs-music" && musicPolling.data?.status === "completed") {
      setMusicUrl(musicPolling.data.audioUrl);
      setMusicJobId(null);
    }
    if (tab === "elevenlabs-music" && musicPolling.data?.status === "error") {
      setError(musicPolling.data.message);
      setMusicJobId(null);
    }
    if (tab === "tripo3d" && tripoPolling.data?.status === "completed") {
      setModelUrl(tripoPolling.data.modelUrl);
      setModelJobId(null);
    }
    if (tab === "tripo3d" && tripoPolling.data?.status === "error") {
      setError(tripoPolling.data.message);
      setModelJobId(null);
    }
    if (tab === "meshy" && meshyPolling.data?.status === "completed") {
      setMeshyUrl(meshyPolling.data.modelUrl);
      setMeshyJobId(null);
    }
    if (tab === "meshy" && meshyPolling.data?.status === "error") {
      setError(meshyPolling.data.message);
      setMeshyJobId(null);
    }
  }, [tab, nanoPolling.data, elevenPolling.data, musicPolling.data, tripoPolling.data, meshyPolling.data]);

  const isGenerating =
    (tab === "nano-banana" && (nanoMutation.isPending || (Boolean(nanoJobId) && nanoPolling.data?.status === "processing"))) ||
    (tab === "elevenlabs" && (elevenMutation.isPending || (Boolean(elevenJobId) && elevenPolling.data?.status === "processing"))) ||
    (tab === "elevenlabs-music" && (musicMutation.isPending || (Boolean(musicJobId) && musicPolling.data?.status === "processing"))) ||
    (tab === "tripo3d" && (tripoMutation.isPending || (Boolean(modelJobId) && tripoPolling.data?.status === "processing")));
    (tab === "meshy" && (meshyMutation.isPending || (Boolean(meshyJobId) && meshyPolling.data?.status === "processing")));

  const currentError =
    error ||
    (tab === "nano-banana" && nanoMutation.error instanceof Error ? nanoMutation.error.message : null) ||
    (tab === "elevenlabs" && elevenMutation.error instanceof Error ? elevenMutation.error.message : null) ||
    (tab === "nano-banana" && nanoPolling.data?.status === "error" ? nanoPolling.data.message : null) ||
    (tab === "elevenlabs" && elevenPolling.data?.status === "error" ? elevenPolling.data.message : null) ||
    (tab === "elevenlabs-music" && musicMutation.error instanceof Error ? musicMutation.error.message : null) ||
    (tab === "tripo3d" && tripoMutation.error instanceof Error ? tripoMutation.error.message : null) ||
    (tab === "elevenlabs-music" && musicPolling.data?.status === "error" ? musicPolling.data.message : null) ||
    (tab === "tripo3d" && tripoPolling.data?.status === "error" ? tripoPolling.data.message : null);
    (tab === "meshy" && meshyMutation.error instanceof Error ? meshyMutation.error.message : null) ||
    (tab === "meshy" && meshyPolling.data?.status === "error" ? meshyPolling.data.message : null);

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
          <button
            type="button"
            onClick={() => setTab("elevenlabs-music")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === "elevenlabs-music" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            ElevenLabs Music
          </button>
          <button
            type="button"
            onClick={() => setTab("tripo3d")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === "tripo3d" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Tripo3D
          </button>
          <button
            type="button"
            onClick={() => setTab("meshy")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === "meshy" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}
          >
            Meshy 3D
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
        ) : tab === "elevenlabs" ? (
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
        ) : tab === "elevenlabs-music" ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <label className="mb-2 block text-sm font-medium">Music prompt</label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
                  placeholder="Upbeat cinematic electronic music with piano and warm strings"
                />
                <button
                  type="button"
                  disabled={!musicPrompt.trim() || isGenerating}
                  onClick={() => {
                    setError(null);
                    setMusicUrl(null);
                    setMusicJobId(null);
                    musicMutation.mutate();
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isGenerating ? "Generating…" : "Generate music"}
                </button>
                {musicUrl && (
                  <div className="mt-6 rounded-xl border border-border p-4">
                    <audio src={musicUrl} controls className="w-full" />
                  </div>
                )}
              </section>
            ) : tab === "tripo3d" ? (
              <section className="rounded-2xl border border-border bg-card p-5">
                <label className="mb-2 block text-sm font-medium">3D model prompt</label>
                <textarea
                  value={modelPrompt}
                  onChange={(e) => setModelPrompt(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
                  placeholder="A stylized low-poly dragon standing on a rock"
                />
                <button
                  type="button"
                  disabled={!modelPrompt.trim() || isGenerating}
                  onClick={() => {
                    setError(null);
                    setModelUrl(null);
                    setModelJobId(null);
                    tripoMutation.mutate();
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isGenerating ? "Generating…" : "Generate 3D model"}
                </button>
                {modelUrl && (
                  <div className="mt-6 rounded-xl border border-border p-4">
                    <a href={modelUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      Download generated 3D model
                    </a>
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-2xl border border-border bg-card p-5">
                <label className="mb-2 block text-sm font-medium">Meshy 3D model prompt</label>
                <textarea
                  value={meshyPrompt}
                  onChange={(e) => setMeshyPrompt(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
                  placeholder="A detailed fantasy castle floating above the clouds"
                />
                <button
                  type="button"
                  disabled={!meshyPrompt.trim() || isGenerating}
                  onClick={() => {
                    setError(null);
                    setMeshyUrl(null);
                    setMeshyJobId(null);
                    meshyMutation.mutate();
                  }}
                  className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {isGenerating ? "Generating…" : "Generate with Meshy"}
                </button>
                {meshyUrl && (
                  <div className="mt-6 rounded-xl border border-border p-4">
                    <a href={meshyUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                      Download generated Meshy model
                    </a>
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
