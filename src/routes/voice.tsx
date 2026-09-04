import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { generateElevenLabs, pollAiMedia } from "@/lib/ai-media.functions";

export const Route = createFileRoute("/voice")({
  component: VoicePage,
});

function VoicePage() {
  const [text, setText] = useState("");
  const [model, setModel] = useState<"elevenlabs-v3-tts" | "elevenlabs-tts-turbo-2-5">("elevenlabs-v3-tts");
  const [voice, setVoice] = useState("Rachel");

  const run = useServerFn(generateElevenLabs);
  const poll = useServerFn(pollAiMedia);

  const mutation = useMutation({
    mutationFn: (data: any) => run({ data }),
  });

  const taskId = mutation.data?.status === "queued" ? mutation.data.taskId : null;

  const polling = useQuery({
    queryKey: ["elevenlabs", taskId],
    queryFn: () =>
      poll({
        data: {
          taskId: taskId!,
        },
      }),
    enabled: Boolean(taskId),
    refetchInterval: 2500,
  });

  const audioUrl =
    mutation.data?.status === "completed"
      ? mutation.data.url
      : polling.data?.status === "completed"
        ? polling.data.url
        : null;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">ElevenLabs</h1>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={5000}
          rows={8}
          placeholder="Écris ton texte..."
          className="w-full rounded-xl border p-4"
        />

        <div className="flex gap-4">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            className="rounded-xl border p-3"
          >
            <option value="elevenlabs-v3-tts">ElevenLabs V3</option>
            <option value="elevenlabs-tts-turbo-2-5">ElevenLabs Turbo 2.5</option>
          </select>

          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="rounded-xl border p-3"
          >
            <option>Rachel</option>
            <option>Aria</option>
            <option>Roger</option>
            <option>Sarah</option>
            <option>Laura</option>
            <option>Charlie</option>
            <option>George</option>
            <option>Liam</option>
          </select>
        </div>

        <button
          disabled={!text.trim() || mutation.isPending}
          onClick={() =>
            mutation.mutate({
              text,
              model,
              voice,
              languageCode: "fr",
            })
          }
          className="rounded-xl bg-primary px-6 py-3"
        >
          Générer la voix
        </button>

        {audioUrl && <audio src={audioUrl} controls className="w-full" />}
      </div>
    </main>
  );
}
