import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  extractMediaUrl,
  extractResultAudioUrl,
  extractResultImageUrl,
  extractTaskId,
  getTaskStatus,
  safeErrorMessage,
  submitGeneration,
} from "./apidot.server";

export type NanoBananaOutput =
  | { status: "processing"; generationId: string }
  | { status: "completed"; generationId: string; imageUrl: string }
  | { status: "error"; message: string };

export type ElevenLabsOutput =
  | { status: "processing"; generationId: string }
  | { status: "completed"; generationId: string; audioUrl: string }
  | { status: "error"; message: string };

export type ElevenLabsMusicOutput =
  | { status: "processing"; generationId: string }
  | { status: "completed"; generationId: string; audioUrl: string }
  | { status: "error"; message: string };

export type Tripo3dOutput =
  | { status: "processing"; generationId: string }
  | { status: "completed"; generationId: string; modelUrl: string }
  | { status: "error"; message: string };

export const generateNanoBanana = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; aspectRatio?: string }) => {
    const prompt = input?.prompt?.trim();
    if (!prompt) throw new Error("Please provide a prompt.");
    return {
      prompt,
      aspectRatio: input.aspectRatio ?? "1:1",
    };
  })
  .handler(async ({ data, context }): Promise<NanoBananaOutput> => {
    const model = "nano-banana";
    const payload = {
      prompt: data.prompt,
      aspect_ratio: data.aspectRatio,
      size: "1024x1024",
    };

    const result = await submitGeneration(model, payload);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "Nano Banana generation failed." };
    }

    const imageUrl = extractResultImageUrl(result.body);
    if (imageUrl) {
      return { status: "completed", generationId: context.userId ?? "nano-banana", imageUrl };
    }

    const taskId = extractTaskId(result.body);
    if (!taskId) {
      return { status: "error", message: "Nano Banana did not return a task id." };
    }

    return { status: "processing", generationId: taskId };
  });

export const pollNanoBanana = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const id = input?.generationId?.trim();
    if (!id) throw new Error("Missing generation id.");
    return { generationId: id };
  })
  .handler(async ({ data }): Promise<NanoBananaOutput> => {
    const result = await getTaskStatus(data.generationId);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "Nano Banana task failed." };
    }

    const imageUrl = extractResultImageUrl(result.body);
    if (imageUrl) {
      return { status: "completed", generationId: data.generationId, imageUrl };
    }

    return { status: "processing", generationId: data.generationId };
  });

export const generateElevenLabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; voiceId?: string }) => {
    const text = input?.text?.trim();
    if (!text) throw new Error("Please provide text to convert to speech.");
    return {
      text,
      voiceId: input.voiceId ?? "default",
    };
  })
  .handler(async ({ data }): Promise<ElevenLabsOutput> => {
    const model = "elevenlabs";
    const payload = {
      text: data.text,
      voice_id: data.voiceId,
      model_id: "eleven_multilingual_v2",
    };

    const result = await submitGeneration(model, payload);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "ElevenLabs generation failed." };
    }

    const audioUrl = extractResultAudioUrl(result.body);
    if (audioUrl) {
      return { status: "completed", generationId: "elevenlabs", audioUrl };
    }

    const taskId = extractTaskId(result.body);
    if (!taskId) {
      return { status: "error", message: "ElevenLabs did not return a task id." };
    }

    return { status: "processing", generationId: taskId };
  });

export const pollElevenLabs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const id = input?.generationId?.trim();
    if (!id) throw new Error("Missing generation id.");
    return { generationId: id };
  })
  .handler(async ({ data }): Promise<ElevenLabsOutput> => {
    const result = await getTaskStatus(data.generationId);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "ElevenLabs task failed." };
    }

    const audioUrl = extractResultAudioUrl(result.body);
    if (audioUrl) {
      return { status: "completed", generationId: data.generationId, audioUrl };
    }

    return { status: "processing", generationId: data.generationId };
  });

export const generateElevenLabsMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => {
    const prompt = input?.prompt?.trim();
    if (!prompt) throw new Error("Please provide a music prompt.");
    return { prompt };
  })
  .handler(async ({ data }): Promise<ElevenLabsMusicOutput> => {
    const result = await submitGeneration("elevenlabs-music", { prompt: data.prompt });
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "ElevenLabs Music generation failed." };
    }

    const audioUrl = extractResultAudioUrl(result.body);
    if (audioUrl) return { status: "completed", generationId: "elevenlabs-music", audioUrl };

    const taskId = extractTaskId(result.body);
    return taskId
      ? { status: "processing", generationId: taskId }
      : { status: "error", message: "ElevenLabs Music did not return a task id." };
  });

export const pollElevenLabsMusic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const id = input?.generationId?.trim();
    if (!id) throw new Error("Missing generation id.");
    return { generationId: id };
  })
  .handler(async ({ data }): Promise<ElevenLabsMusicOutput> => {
    const result = await getTaskStatus(data.generationId);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "ElevenLabs Music task failed." };
    }
    const audioUrl = extractResultAudioUrl(result.body);
    return audioUrl
      ? { status: "completed", generationId: data.generationId, audioUrl }
      : { status: "processing", generationId: data.generationId };
  });

export const generateTripo3d = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => {
    const prompt = input?.prompt?.trim();
    if (!prompt) throw new Error("Please provide a 3D model prompt.");
    return { prompt };
  })
  .handler(async ({ data }): Promise<Tripo3dOutput> => {
    const result = await submitGeneration("tripo3d-h3.1-text-to-3d", { prompt: data.prompt });
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "Tripo3D generation failed." };
    }

    const modelUrl = extractMediaUrl(result.body, ["glb", "gltf", "obj", "fbx", "model", "3d"]);
    if (modelUrl) return { status: "completed", generationId: "tripo3d-h3.1-text-to-3d", modelUrl };

    const taskId = extractTaskId(result.body);
    return taskId
      ? { status: "processing", generationId: taskId }
      : { status: "error", message: "Tripo3D did not return a task id." };
  });

export const pollTripo3d = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const id = input?.generationId?.trim();
    if (!id) throw new Error("Missing generation id.");
    return { generationId: id };
  })
  .handler(async ({ data }): Promise<Tripo3dOutput> => {
    const result = await getTaskStatus(data.generationId);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? "Tripo3D task failed." };
    }
    const modelUrl = extractMediaUrl(result.body, ["glb", "gltf", "obj", "fbx", "model", "3d"]);
    return modelUrl
      ? { status: "completed", generationId: data.generationId, modelUrl }
      : { status: "processing", generationId: data.generationId };
  });
