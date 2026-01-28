/**
 * Theme Index
 * Single entry point for all theme exports
 */

// Design Tokens (production-grade)
export * from "./tokens";

// Legacy exports (for backward compatibility)
export { default as colors, gradients } from "./colors";
export type { Colors, Gradients } from "./colors";

export { default as metrics } from "./metrics";
export type {
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  LineHeight,
  Shadow,
  Shadows,
  Screen,
  PlatformInfo,
  Animation,
  InputHeight,
} from "./metrics";

export * from "./colors";
export * from "./metrics";
export * from "./styles";
