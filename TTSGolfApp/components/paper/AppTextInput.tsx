/**
 * AppTextInput — Paper TextInput wrapper
 *
 * Usage:
 *   <AppTextInput label="Phone" value={v} onChangeText={set} mode="outlined" />
 */
import React, { memo } from "react";
import { View } from "react-native";
import { TextInput, HelperText, type TextInputProps } from "react-native-paper";
import { MotiView } from "moti";
import { transitions } from "../../theme/animations";
import { fontFamilies } from "../../theme/fonts";

export interface AppTextInputProps extends Omit<TextInputProps, "theme"> {
  /** Error message (shows HelperText below) */
  error?: boolean;
  errorMessage?: string;
  /** Layout wrapper class */
  wrapperClassName?: string;
  /** Animate entry */
  animateEntry?: boolean;
  entryDelay?: number;
}

function AppTextInputInner({
  wrapperClassName,
  animateEntry = false,
  entryDelay = 0,
  errorMessage,
  error,
  style,
  showSoftInputOnFocus = true,
  ...rest
}: AppTextInputProps) {
  const Wrapper = animateEntry ? MotiView : View;
  const motiProps = animateEntry
    ? {
        from: { opacity: 0, translateY: 8 },
        animate: { opacity: 1, translateY: 0 },
        transition: { ...transitions.standard, delay: entryDelay },
      }
    : {};

  return (
    <Wrapper className={wrapperClassName} {...motiProps}>
      <TextInput
        mode="outlined"
        outlineStyle={{ borderRadius: 12 }}
        contentStyle={{ fontFamily: fontFamilies.regular }}
        error={error}
        style={[{ backgroundColor: "transparent" }, style as any]}
        showSoftInputOnFocus={showSoftInputOnFocus}
        {...rest}
      />
      {error && errorMessage ? (
        <HelperText type="error" visible>
          {errorMessage}
        </HelperText>
      ) : null}
    </Wrapper>
  );
}

export const AppTextInput = memo(AppTextInputInner);
