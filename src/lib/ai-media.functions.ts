import { createServerFn } from "@tanstack/react-start";

export type GenerateImageInput = {
  prompt: string;
  model?:
    | "nano-banana-2"
    | "nano-banana-2-lite"
    | "nano-banana-pro";
  resolution?: "0.5K" | "1K" | "2K" | "4K";
  size?: "auto" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  imageUrls?: string[];
};

export type GenerateSpeechInput = {
  text: string;
  model?:
    | "elevenlabs-v3-tts"
    | "elevenlabs-tts-turbo-2-5";
  voice?: string;
  languageCode?: string;
  stability?: number;
  speed?: number;
};

type GenerateOutput =
  | {
      status: "queued";
      taskId: string;
    }
  | {
      status: "completed";
      url: string;
    }
  | {
      status: "error";
      message: string;
    };

type PollOutput =
  | {
      status: "processing";
    }
  | {
      status: "completed";
      url: string;
    }
  | {
      status: "error";
      message: string;
    };

export const generateNanoBanana = createServerFn({
  method: "POST",
})
  .inputValidator((input: GenerateImageInput) => {
    const prompt = input?.prompt?.trim();

    if (!prompt) {
      throw new Error("Le prompt est requis.");
    }

    if (prompt.length > 10000) {
      throw new Error("Le prompt est trop long.");
    }

    const model = input.model ?? "nano-banana-2";
    const resolution = input.resolution ?? "1K";
    const size = input.size ?? "auto";

    const imageUrls = Array.isArray(input.imageUrls)
      ? input.imageUrls
          .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
          .slice(0, 14)
      : [];

    if (model === "nano-banana-2-lite" && resolution !== "1K") {
      throw new Error("Nano Banana 2 Lite fonctionne en 1K.");
    }

    return {
      prompt,
      model,
      resolution,
      size,
      imageUrls,
    };
  })
  .handler(async ({ data }): Promise<GenerateOutput> => {
    const { submitGeneration, extractTaskId, extractMediaUrl, safeErrorMessage } = await import("./apidot.server");

    const input: Record<string, unknown> = {
      prompt: data.prompt,
      resolution: data.resolution,
      size: data.size,
      output_format: "png",
      google_search: false,
    };

    if (data.imageUrls.length) {
      input.image_urls = data.imageUrls;
    }

    const result = await submitGeneration(data.model, input);

    if (!result.ok) {
      return {
        status: "error",
        message: safeErrorMessage(result.body) ?? "Erreur APIDot.",
      };
    }

    const url = extractMediaUrl(result.body, ["image", "png", "jpg", "jpeg", "webp"]);

    if (url) {
      return {
        status: "completed",
        url,
      };
    }

    const taskId = extractTaskId(result.body);

    return taskId
      ? {
          status: "queued",
          taskId,
        }
      : {
          status: "error",
          message: "APIDot n'a retourné ni tâche ni image.",
        };
  });

export const generateElevenLabs = createServerFn({
  method: "POST",
})
  .inputValidator((input: GenerateSpeechInput) => {
    const text = input?.text?.trim();

    if (!text) {
      throw new Error("Le texte est requis.");
    }

    if (text.length > 5000) {
      throw new Error("Le texte est limité à 5000 caractères.");
    }

    const model = input.model ?? "elevenlabs-v3-tts";

    return {
      text,
      model,
      voice: input.voice?.trim() || "Rachel",
      languageCode: input.languageCode?.trim() || "fr",
      stability: Math.min(1, Math.max(0, Number(input.stability ?? 0.5))),
      speed: Math.min(1.2, Math.max(0.7, Number(input.speed ?? 1))),
    };
  })
  .handler(async ({ data }): Promise<GenerateOutput> => {
    const { submitGeneration, extractTaskId, extractMediaUrl, safeErrorMessage } = await import("./apidot.server");

    const input: Record<string, unknown> = {
      text: data.text,
      voice: data.voice,
      stability: data.stability,
      timestamps: false,
      language_code: data.languageCode,
      apply_text_normalization: "auto",
    };

    if (data.model === "elevenlabs-tts-turbo-2-5") {
      input.similarity_boost = 0.75;
      input.style = 0;
      input.speed = data.speed;
    }

    const result = await submitGeneration(data.model, input);

    if (!result.ok) {
      return {
        status: "error",
        message: safeErrorMessage(result.body) ?? "Erreur APIDot.",
      };
    }

    const url = extractMediaUrl(result.body, ["audio", "mp3", "wav", "ogg", "m4a"]);

    if (url) {
      return {
        status: "completed",
        url,
      };
    }

    const taskId = extractTaskId(result.body);

    return taskId
      ? {
          status: "queued",
          taskId,
        }
      : {
          status: "error",
          message: "APIDot n'a retourné ni tâche ni audio.",
        };
  });

export const pollAiMedia = createServerFn({
  method: "GET",
})
  .inputValidator((input: { taskId: string }) => {
    const taskId = input?.taskId?.trim();

    if (!taskId) {
      throw new Error("Identifiant de tâche manquant.");
    }

    return { taskId };
  })
  .handler(async ({ data }): Promise<PollOutput> => {
    const { getTaskStatus, extractTaskStatus, extractMediaUrl, safeErrorMessage } = await import("./apidot.server");

    const result = await getTaskStatus(data.taskId);

    if (!result.ok) {
      return {
        status: "error",
        message: safeErrorMessage(result.body) ?? "Erreur de statut APIDot.",
      };
    }

    const status = extractTaskStatus(result.body);

    if (status === "failed" || status === "cancelled" || status === "error") {
      return {
        status: "error",
        message: safeErrorMessage(result.body) ?? "La génération a échoué.",
      };
    }

    const url = extractMediaUrl(result.body, [
      "image",
      "png",
      "jpg",
      "jpeg",
      "webp",
      "audio",
      "mp3",
      "wav",
      "ogg",
      "m4a",
    ]);

    if (url) {
      return {
        status: "completed",
        url,
      };
    }

    return {
      status: "processing",
    };
  });
