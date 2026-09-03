import { createServerFn } from "@tanstack/react-start";

export type CharacterSwapSubmitInput = {
  imagePath: string;
  videoPath: string;
};

export type CharacterSwapSubmitOutput =
  | { status: "queued"; taskId: string }
  | { status: "completed"; videoUrl: string }
  | { status: "error"; message: string };

export type CharacterSwapPollOutput =
  | { status: "processing" }
  | { status: "completed"; videoUrl: string }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Video generation failed. Please try again.";

export const submitCharacterSwap = createServerFn({ method: "POST" })
  .inputValidator((input: CharacterSwapSubmitInput) => {
    const imagePath = input?.imagePath?.trim();
    const videoPath = input?.videoPath?.trim();
    if (!imagePath) throw new Error("Please upload an image.");
    if (!videoPath) throw new Error("Please upload a video.");
    return { imagePath, videoPath };
  })
  .handler(async ({ data }): Promise<CharacterSwapSubmitOutput> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { submitMotionControl, extractTaskId, extractResultVideoUrl, safeErrorMessage } =
      await import("./apidot.server");

    const signed = await supabaseAdmin.storage
      .from("character-swap")
      .createSignedUrls([data.imagePath, data.videoPath], 60 * 60);

    const imageUrl = signed.data?.[0]?.signedUrl;
    const videoUrl = signed.data?.[1]?.signedUrl;
    if (signed.error || !imageUrl || !videoUrl) {
      return { status: "error", message: "Upload failed. Please try again." };
    }

    const result = await submitMotionControl({ image: imageUrl, video: videoUrl });
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? GENERIC_ERROR };
    }

    const finished = extractResultVideoUrl(result.body);
    if (finished) return { status: "completed", videoUrl: finished };

    const taskId = extractTaskId(result.body);
    if (taskId) return { status: "queued", taskId };

    return { status: "error", message: GENERIC_ERROR };
  });

export const pollCharacterSwap = createServerFn({ method: "POST" })
  .inputValidator((input: { taskId: string }) => {
    const taskId = input?.taskId?.trim();
    if (!taskId) throw new Error(GENERIC_ERROR);
    return { taskId };
  })
  .handler(async ({ data }): Promise<CharacterSwapPollOutput> => {
    const { getMotionControlStatus, extractTaskStatus, extractResultVideoUrl, safeErrorMessage } =
      await import("./apidot.server");

    const result = await getMotionControlStatus(data.taskId);
    if (!result.ok) {
      return { status: "error", message: safeErrorMessage(result.body) ?? GENERIC_ERROR };
    }

    const videoUrl = extractResultVideoUrl(result.body);
    const state = extractTaskStatus(result.body);

    if (videoUrl && (!state || ["completed", "succeeded", "success", "done"].includes(state))) {
      return { status: "completed", videoUrl };
    }
    if (state && ["failed", "error", "canceled", "cancelled"].includes(state)) {
      return { status: "error", message: safeErrorMessage(result.body) ?? GENERIC_ERROR };
    }
    return { status: "processing" };
  });
