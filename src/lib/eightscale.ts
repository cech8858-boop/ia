// Client-safe shared types + pricing for the 8Scale Wan 2.2 models.
// Pricing values come from GET https://api.8scale.com/v1/models
// (pricing.tables[0]: fields ["resolution","seconds"], values in 1/1000 USD cents-like units
//  where 10 => $0.010, 15 => $0.015, ...).

export const EIGHTSCALE_MODELS = {
  textToVideo: "wan-2.2/14b/text-to-video",
  imageToVideo: "wan-2.2/14b/image-to-video",
  multiScene: "wan-2.2/14b/multi-scene",
} as const;

export const RESOLUTIONS = ["480p", "580p", "720p"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const DURATIONS = [3, 5] as const;
export type Duration = (typeof DURATIONS)[number];

/** Multi-Scene supports longer narratives, up to 60s. */
export const MULTI_SCENE_DURATIONS = [10, 20, 30, 45, 60] as const;
export type MultiSceneDuration = (typeof MULTI_SCENE_DURATIONS)[number];

export const ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export function validateResolution(value: unknown): Resolution {
  if (value === "480p" || value === "580p" || value === "720p") return value;
  throw new Error("Résolution invalide.");
}

export function validateAspectRatio(value: unknown): AspectRatio {
  if (value === "16:9" || value === "9:16" || value === "1:1") return value;
  throw new Error("Format d'image invalide.");
}

/** price table from the API, expressed in thousandths of a dollar */
const PRICE_TABLE: Record<string, number> = {
  "480p|3": 10,
  "480p|5": 15,
  "580p|3": 14,
  "580p|5": 24,
  "720p|3": 24,
  "720p|5": 44,
};

export function estimatePriceUsd(resolution: Resolution, seconds: Duration): number {
  const raw = PRICE_TABLE[`${resolution}|${seconds}`] ?? 15;
  return raw / 1000;
}

/**
 * Multi-Scene pricing is not exposed in the public pricing table.
 * The API only returns a basePrice/lowestPrice with no per-resolution/seconds table,
 * so we cannot provide a reliable upfront estimate. The UI shows "—" for this case.
 */
export function estimateMultiScenePriceUsd(): number | null {
  return null;
}

export function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return `$${value.toFixed(3)}`;
}

