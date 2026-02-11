/**
 * UI Design System — Master Index
 *
 * The single entry point for all UI in the application.
 * Every screen imports from here or from sub-paths.
 *
 * Structure:
 *   /ui
 *     /theme       → tokens, colors, Paper themes, theme context
 *     /layout      → ScreenShell, ContentArea
 *     /primitives  → AppButton, AppText, AppCard, AppInput, etc.
 *     /feedback    → Skeleton, EmptyState, ErrorState, LoadingOverlay, etc.
 *     /motion      → animation presets, AnimatedListItem
 *     /navigation  → AppHeader, AppBottomNav
 */

// Theme
export * from './theme';

// Layout
export * from './layout';

// Primitives
export * from './primitives';

// Feedback
export * from './feedback';

// Motion
export * from './motion';

// Navigation
export * from './navigation';
