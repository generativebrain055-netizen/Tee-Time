/**
 * Paper UI Component Library
 *
 * Single source of truth for all interactive UI.
 * - react-native-paper → every button, input, card, chip, modal, etc.
 * - nativewind         → layout, spacing, sizing  (NO inline styles unless anim)
 * - moti               → enter / exit / micro-interaction animations
 *
 * NEVER create manual TouchableOpacity buttons or TextInput wrappers.
 * Import from here or directly from react-native-paper.
 */

export { AppButton, type AppButtonProps } from "./AppButton";
export { AppTextInput, type AppTextInputProps } from "./AppTextInput";
export { AppCard, AppCardTitle, AppCardContent, AppCardActions, type AppCardProps } from "./AppCard";
export { AppChip, type AppChipProps } from "./AppChip";
export { AppBadge } from "./AppBadge";
export { AppAvatar, type AppAvatarProps } from "./AppAvatar";
export { AppDivider } from "./AppDivider";
export { AppSnackbar, type AppSnackbarProps } from "./AppSnackbar";
export { AppModal, type AppModalProps } from "./AppModal";
export { AppSearchBar, type AppSearchBarProps } from "./AppSearchBar";
export { ScreenWrapper } from "./ScreenWrapper";
export { AnimatedListItem } from "./AnimatedListItem";
