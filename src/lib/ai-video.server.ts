// Server-only helpers for the APIDot AI Video Generator.
// Never imported from client code.

export const GENERIC_ERROR = "Video generation failed. Please try again.";

export type CreateInput = {
  family: string;
  mode: "text_to_video" | "image_to_video";
  duration: number;
  resolution: string | null;
  aspectRatio: string;
  prompt: string;
  imagePath: string | null;
};

/** Builds the documented APIDot `input` payload for a given model id. */
export function buildApiDotInput(
  modelId: string,
  data: CreateInput,
  imageUrl: string | null,
): Record<string, unknown> | { error: string } {
  if (modelId.startsWith("kling-2.1")) {
    if (!imageUrl) return { error: "Please upload an image." };
    return {
      prompt: data.prompt,
      duration: data.duration,
      start_image_url: imageUrl,
    };
  }

  if (modelId.startsWith("veo3.1")) {
    return {
      prompt: data.prompt,
      duration: data.duration,
      aspect_ratio: data.aspectRatio,
      resolution: data.resolution ?? "720p",
    };
  }

  if (modelId.startsWith("sora-2")) {
    const input: Record<string, unknown> = {
      prompt: data.prompt,
      duration: data.duration,
      aspect_ratio: data.aspectRatio,
    };
    if (data.mode === "image_to_video") {
      if (!imageUrl) return { error: "Please upload an image." };
      input["image_urls"] = [imageUrl];
    }
    return input;
  }

  return { error: "This model is not available." };
}

export function isTerminalFailure(state: string | null): boolean {
  return Boolean(state && ["failed", "error", "canceled", "cancelled"].includes(state));
}

export function isSuccess(state: string | null): boolean {
  return Boolean(state && ["completed", "succeeded", "success", "done"].includes(state));
}
