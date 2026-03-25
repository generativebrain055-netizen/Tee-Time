/**
 * AppInput — token-based text input.
 *
 * Built on Paper's TextInput for theming + accessibility.
 *
 * Usage:
 *   <AppInput label="Email" value={email} onChangeText={setEmail} />
 *   <AppInput label="Phone" keyboardType="phone-pad" error="Required" />
 */
import React, { memo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { TextInput, HelperText, type TextInputProps } from 'react-native-paper';
import { componentTokens, fontFamily } from '../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputSize = 'sm' | 'md' | 'lg';

export interface AppInputProps extends Omit<TextInputProps, 'style' | 'error'> {
  /** Size variant. Default: md. */
  size?: InputSize;
  /** Display error state (boolean for Paper). */
  error?: boolean;
  /** Error message (shown below the input). */
  errorMessage?: string;
  /** Helper text (shown below input when no error). */
  helperText?: string;
  /** NativeWind class for outer wrapper. */
  wrapperClassName?: string;
  /** Style override. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AppInputInner({
  size = 'md',
  error,
  errorMessage,
  helperText,
  wrapperClassName,
  style,
  showSoftInputOnFocus = true,
  ...rest
}: AppInputProps) {
  const h = componentTokens.input.height[size];
  const displayText = errorMessage || helperText;

  return (
    <View className={wrapperClassName}>
      <TextInput
        mode="outlined"
        outlineStyle={{ borderRadius: componentTokens.input.borderRadius }}
        contentStyle={{
          fontFamily: fontFamily.regular,
          height: h,
        }}
        style={[{ backgroundColor: 'transparent' }, style]}
        error={error || !!errorMessage}
        showSoftInputOnFocus={showSoftInputOnFocus}
        {...rest}
      />
      {displayText ? (
        <HelperText type={error || errorMessage ? "error" : "info"} visible>
          {displayText}
        </HelperText>
      ) : null}
    </View>
  );
}

export const AppInput = memo(AppInputInner);
AppInput.displayName = 'AppInput';

export default AppInput;
