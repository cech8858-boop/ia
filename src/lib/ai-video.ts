// Client-safe shared types for the AI Video Generator (APIDot).

export type VideoMode = "text_to_video" | "image_to_video";

export type VideoModelRow = {
  id: string;
  provider: string;
  family: string;
  label: string;
  model_id: string;
  mode: string;
  resolution: string | null;
  duration: number;
  aspect_ratios: string[];
  credits_required: number;
  api_cost: number;
  active: boolean;
  sort_order: number;
};

export const FAMILY_LABELS: Record<string, string> = {
  kling: "Kling",
  veo: "Veo",
  sora: "Sora",
};

export const FAMILY_ORDER = ["kling", "veo", "sora"];

export const MODE_LABELS: Record<VideoMode, string> = {
  text_to_video: "Text to Video",
  image_to_video: "Image to Video",
};
