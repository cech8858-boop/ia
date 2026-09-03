import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CreateVideoInput = {
  family: string;
  mode: "text_to_video" | "image_to_video";
  duration: number;
  resolution: string | null;
  aspectRatio: string;
  prompt: string;
  imagePath: string | null;
};

export type CreateVideoOutput =
  | { status: "processing"; generationId: string }
  | { status: "completed"; generationId: string; videoUrl: string }
  | { status: "error"; message: string };

export type PollVideoOutput =
  | { status: "processing" }
  | { status: "completed"; videoUrl: string }
  | { status: "error"; message: string };

export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ balance: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_credits")
      .select("balance")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) {
      await supabaseAdmin.from("user_credits").insert({ user_id: context.userId });
      return { balance: 100 };
    }
    return { balance: data.balance };
  });

export const createVideoGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateVideoInput) => {
    const prompt = input?.prompt?.trim();
    if (!prompt) throw new Error("Please write a prompt.");
    if (input.mode === "image_to_video" && !input.imagePath?.trim()) {
      throw new Error("Please upload an image.");
    }
    return {
      family: String(input.family),
      mode: input.mode === "image_to_video" ? ("image_to_video" as const) : ("text_to_video" as const),
      duration: Number(input.duration),
      resolution: input.resolution ? String(input.resolution) : null,
      aspectRatio: input.aspectRatio ? String(input.aspectRatio) : "16:9",
      prompt,
      imagePath: input.imagePath?.trim() || null,
    };
  })
  .handler(async ({ data, context }): Promise<CreateVideoOutput> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { submitGeneration, extractTaskId, extractResultVideoUrl, safeErrorMessage } =
      await import("./apidot.server");
    const { buildApiDotInput, GENERIC_ERROR } = await import("./ai-video.server");

    let query = supabaseAdmin
      .from("video_models")
      .select("*")
      .eq("active", true)
      .eq("family", data.family)
      .eq("mode", data.mode)
      .eq("duration", data.duration);
    query = data.resolution ? query.eq("resolution", data.resolution) : query.is("resolution", null);

    const { data: model } = await query.maybeSingle();
    if (!model) return { status: "error", message: "This configuration is not available." };

    let imageUrl: string | null = null;
    if (data.imagePath) {
      if (!data.imagePath.startsWith(`${context.userId}/`)) {
        return { status: "error", message: "Upload failed. Please try again." };
      }
      const signed = await supabaseAdmin.storage
        .from("video-inputs")
        .createSignedUrl(data.imagePath, 60 * 60);
      imageUrl = signed.data?.signedUrl ?? null;
      if (!imageUrl) return { status: "error", message: "Upload failed. Please try again." };
    }

    const payload = buildApiDotInput(model.model_id, data, imageUrl);
    if ("error" in payload) return { status: "error", message: String(payload["error"]) };

    const { data: reserved } = await supabaseAdmin.rpc("reserve_credits", {
      _user_id: context.userId,
      _amount: model.credits_required,
    });
    if (!reserved) return { status: "error", message: "Not enough credits." };

    const { data: row, error: insertError } = await supabaseAdmin
      .from("video_generations")
      .insert({
        user_id: context.userId,
        provider: model.provider,
        model: model.model_id,
        mode: data.mode,
        prompt: data.prompt,
        image_url: data.imagePath,
        duration: data.duration,
        resolution: data.resolution,
        aspect_ratio: data.aspectRatio,
        credits_used: model.credits_required,
        api_cost: model.api_cost,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !row) {
      await supabaseAdmin.rpc("refund_credits", {
        _user_id: context.userId,
        _amount: model.credits_required,
      });
      return { status: "error", message: GENERIC_ERROR };
    }

    const result = await submitGeneration(model.model_id, payload as Record<string, unknown>);

    if (!result.ok) {
      await supabaseAdmin.rpc("refund_credits", {
        _user_id: context.userId,
        _amount: model.credits_required,
      });
      await supabaseAdmin
        .from("video_generations")
        .update({ status: "failed", credits_used: 0, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "error", message: safeErrorMessage(result.body) ?? GENERIC_ERROR };
    }

    const finished = extractResultVideoUrl(result.body);
    if (finished) {
      await supabaseAdmin
        .from("video_generations")
        .update({ status: "completed", output_url: finished, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "completed", generationId: row.id, videoUrl: finished };
    }

    const taskId = extractTaskId(result.body);
    if (!taskId) {
      await supabaseAdmin.rpc("refund_credits", {
        _user_id: context.userId,
        _amount: model.credits_required,
      });
      await supabaseAdmin
        .from("video_generations")
        .update({ status: "failed", credits_used: 0, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "error", message: GENERIC_ERROR };
    }

    await supabaseAdmin
      .from("video_generations")
      .update({ task_id: taskId, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    return { status: "processing", generationId: row.id };
  });

export const pollVideoGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const generationId = input?.generationId?.trim();
    if (!generationId) throw new Error("Missing generation id.");
    return { generationId };
  })
  .handler(async ({ data, context }): Promise<PollVideoOutput> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTaskStatus, extractTaskStatus, extractResultVideoUrl, safeErrorMessage } =
      await import("./apidot.server");
    const { GENERIC_ERROR, isSuccess, isTerminalFailure } = await import("./ai-video.server");

    const { data: row } = await supabaseAdmin
      .from("video_generations")
      .select("id, user_id, task_id, status, output_url, credits_used")
      .eq("id", data.generationId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row) return { status: "error", message: GENERIC_ERROR };
    if (row.status === "completed" && row.output_url) {
      return { status: "completed", videoUrl: row.output_url };
    }
    if (row.status === "failed") return { status: "error", message: GENERIC_ERROR };
    if (!row.task_id) return { status: "processing" };

    const result = await getTaskStatus(row.task_id);
    if (!result.ok) return { status: "processing" };

    const videoUrl = extractResultVideoUrl(result.body);
    const state = extractTaskStatus(result.body);

    if (videoUrl && (!state || isSuccess(state))) {
      await supabaseAdmin
        .from("video_generations")
        .update({ status: "completed", output_url: videoUrl, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return { status: "completed", videoUrl };
    }

    if (isTerminalFailure(state)) {
      const message = safeErrorMessage(result.body) ?? GENERIC_ERROR;
      await supabaseAdmin.rpc("refund_credits", {
        _user_id: context.userId,
        _amount: row.credits_used,
      });
      await supabaseAdmin
        .from("video_generations")
        .update({
          status: "failed",
          credits_used: 0,
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return { status: "error", message };
    }

    return { status: "processing" };
  });
