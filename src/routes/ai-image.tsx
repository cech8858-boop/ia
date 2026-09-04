import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { generateNanoBanana, pollAiMedia } from "@/lib/ai-media.functions";

export const Route = createFileRoute("/ai-image")({
  component: NanoBananaPage,
});

function NanoBananaPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<
    | "nano-banana-2"
    | "nano-banana-2-lite"
    | "nano-banana-pro"
  >("nano-banana-2");

  const [resolution, setResolution] = useState<"0.5K" | "1K" | "2K" | "4K">("1K");

  const run = useServerFn(generateNanoBanana);
  const poll = useServerFn(pollAiMedia);

  const mutation = useMutation({
    mutationFn: (data: any) => run({ data }),
  });

  const taskId = mutation.data?.status === "queued" ? mutation.data.taskId : null;

  const polling = useQuery({
    queryKey: ["nano-banana", taskId],
    queryFn: () =>
      poll({
        data: {
          taskId: taskId!,
        },
      }),
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status === "completed" || status === "error") {
        return false;
      }

      return 2500;
    },
  });

  const imageUrl =
    mutation.data?.status === "completed"
      ? mutation.data.url
      : polling.data?.status === "completed"
        ? polling.data.url
        : null;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">Nano Banana</h1>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décris ton image..."
          rows={6}
          className="w-full rounded-xl border p-4"
        />

        <select
          value={model}
          onChange={(e) => setModel(e.target.value as any)}
          className="rounded-xl border p-3"
        >
          <option value="nano-banana-2">Nano Banana 2</option>
          <option value="nano-banana-2-lite">Nano Banana 2 Lite</option>
          <option value="nano-banana-pro">Nano Banana Pro</option>
        </select>

        <select
          value={resolution}
          onChange={(e) => setResolution(e.target.value as any)}
          className="rounded-xl border p-3"
        >
          <option value="0.5K">0.5K</option>
          <option value="1K">1K</option>
          <option value="2K">2K</option>
          <option value="4K">4K</option>
        </select>

        <button
          disabled={!prompt.trim() || mutation.isPending}
          onClick={() =>
            mutation.mutate({
              prompt,
              model,
              resolution,
              size: "auto",
            })
          }
          className="rounded-xl bg-primary px-6 py-3"
        >
          Générer
        </button>

        {imageUrl && <img src={imageUrl} alt="Image générée" className="w-full rounded-xl" />}
      </div>
    </main>
  );
}
