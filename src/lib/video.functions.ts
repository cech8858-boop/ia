import { createServerFn } from "@tanstack/react-start";
import { validateAspectRatio, validateResolution } from "./eightscale";

export type GenerateVideoInput = {
  prompt: string;
  resolution: "480p" | "580p" | "720p";
  seconds: 3 | 5;
  aspect_ratio: "16:9" | "9:16" | "1:1";
};

export type GenerateVideoOutput =
  | { status: "queued"; requestId: string }
  | { status: "completed"; videoUrl: string }
  | { status: "error"; message: string };

export type PollVideoOutput =
  | { status: "processing" }
  | { status: "completed"; videoUrl: string }
  | { status: "error"; message: string };

export type GenerateMultiSceneInput = {
  prompts: string[];
  resolution: "480p" | "580p" | "720p";
  seconds: 10 | 20 | 30 | 45 | 60;
  aspect_ratio: "16:9" | "9:16" | "1:1";
};

export const generateTextToVideo = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateVideoInput) => {
    if (!input?.prompt?.trim()) throw new Error("Le prompt est requis.");
    return {
      prompt: input.prompt.trim(),
      resolution: validateResolution(input.resolution),
      seconds: input.seconds,
      aspect_ratio: validateAspectRatio(input.aspect_ratio),
    };
  })
  .handler(async ({ data }): Promise<GenerateVideoOutput> => {
    const { callEightScale, extractRequestId, extractVideoUrl, errorMessageFrom } = await import(
      "./eightscale.server"
    );

    const result = await callEightScale("wan-2.2/14b/text-to-video", {
      prompt: data.prompt,
      resolution: data.resolution,
      seconds: data.seconds,
      aspect_ratio: data.aspect_ratio,
    });

    if (!result.ok) {
      return { status: "error", message: errorMessageFrom(result.body, result.status) };
    }

    const videoUrl = extractVideoUrl(result.body);
    if (videoUrl) return { status: "completed", videoUrl };

    const requestId = extractRequestId(result.body);
    if (requestId) return { status: "queued", requestId };

    return {
      status: "error",
      message: "8Scale n'a retourné ni identifiant de tâche ni URL vidéo.",
    };
  });

export const pollTextToVideo = createServerFn({ method: "GET" })
  .inputValidator((input: { requestId: string }) => {
    const requestId = input?.requestId?.trim();
    if (!requestId) throw new Error("Identifiant de génération manquant.");
    return { requestId };
  })
  .handler(async ({ data }): Promise<PollVideoOutput> => {
    const { errorMessageFrom, extractStatus, extractVideoUrl, getEightScaleStatus } =
      await import("./eightscale.server");
    const result = await getEightScaleStatus(data.requestId);
    if (!result.ok) {
      return { status: "error", message: errorMessageFrom(result.body, result.status) };
    }

    const status = extractStatus(result.body);
    if (status === "FAILED" || status === "CANCELLED") {
      return { status: "error", message: errorMessageFrom(result.body, result.status) };
    }
    if (status !== "COMPLETED") return { status: "processing" };

    const videoUrl = extractVideoUrl(result.body);
    return videoUrl
      ? { status: "completed", videoUrl }
      : { status: "error", message: "La tâche est terminée, mais 8Scale n'a fourni aucune vidéo." };
  });

export const generateMultiScene = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateMultiSceneInput) => {
    const prompts = Array.isArray(input?.prompts)
      ? input.prompts.map((p) => (typeof p === "string" ? p.trim() : "")).filter(Boolean)
      : [];
    if (prompts.length < 2) throw new Error("Au moins deux scènes sont nécessaires.");
    const seconds = Number(input?.seconds);
    if (![10, 20, 30, 45, 60].includes(seconds)) throw new Error("Durée invalide.");
    return {
      prompts,
      resolution: validateResolution(input.resolution),
      seconds: seconds as GenerateMultiSceneInput["seconds"],
      aspect_ratio: validateAspectRatio(input.aspect_ratio),
    };
  })
  .handler(async ({ data }): Promise<GenerateVideoOutput> => {
    const { callEightScale, extractRequestId, extractVideoUrl, errorMessageFrom } = await import(
      "./eightscale.server"
    );

    const result = await callEightScale("wan-2.2/14b/multi-scene", {
      prompt: data.prompts,
      resolution: data.resolution,
      seconds: data.seconds,
      aspect_ratio: data.aspect_ratio,
    });

    if (!result.ok) {
      return { status: "error", message: errorMessageFrom(result.body, result.status) };
    }

    const videoUrl = extractVideoUrl(result.body);
    if (videoUrl) return { status: "completed", videoUrl };

    const requestId = extractRequestId(result.body);
    if (requestId) return { status: "queued", requestId };

    return {
      status: "error",
      message: "8Scale n'a retourné ni identifiant de tâche ni URL vidéo.",
    };
  });

export const pollMultiScene = pollTextToVideo;

export type GenerateImageToVideoInput = {
  prompt: string;
  image: string;
  resolution: "480p" | "580p" | "720p";
  seconds: 3 | 5;
  aspect_ratio: "16:9" | "9:16" | "1:1";
};

export const generateImageToVideo = createServerFn({ method: "POST" })
  .inputValidator((input: GenerateImageToVideoInput) => {
    const image = typeof input?.image === "string" ? input.image.trim() : "";
    if (!image) throw new Error("Une image de départ est requise.");
    if (!/^(https?:\/\/|data:image\/)/i.test(image)) {
      throw new Error("L'image doit être une URL http(s) ou un fichier importé.");
    }
    return {
      prompt: typeof input?.prompt === "string" ? input.prompt.trim() : "",
      image,
      resolution: validateResolution(input.resolution),
      seconds: input.seconds,
      aspect_ratio: validateAspectRatio(input.aspect_ratio),
    };
  })
  .handler(async ({ data }): Promise<GenerateVideoOutput> => {
    const { callEightScale, extractRequestId, extractVideoUrl, errorMessageFrom } = await import(
      "./eightscale.server"
    );

    const result = await callEightScale("wan-2.2/14b/image-to-video", {
      prompt: data.prompt,
      image: data.image,
      resolution: data.resolution,
      seconds: data.seconds,
      aspect_ratio: data.aspect_ratio,
    });

    if (!result.ok) {
      return { status: "error", message: errorMessageFrom(result.body, result.status) };
    }

    const videoUrl = extractVideoUrl(result.body);
    if (videoUrl) return { status: "completed", videoUrl };

    const requestId = extractRequestId(result.body);
    if (requestId) return { status: "queued", requestId };

    return {
      status: "error",
      message: "8Scale n'a retourné ni identifiant de tâche ni URL vidéo.",
    };
  });

export const pollImageToVideo = pollTextToVideo;
