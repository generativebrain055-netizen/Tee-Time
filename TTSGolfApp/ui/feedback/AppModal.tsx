/**
 * AppModal — Paper Modal with Moti scale-in animation.
 *
 * Usage:
 *   <AppModal visible={show} onDismiss={close}>
 *     <AppText variant="titleLarge">Confirm</AppText>
 *     <AppButton onPress={confirm}>OK</AppButton>
 *   </AppModal>
 */
import React, { memo, type ReactNode } from 'react';
import { Modal, Portal } from 'react-native-paper';
import { MotiView, AnimatePresence } from 'moti';
import { componentTokens, animation, spacing } from '../theme/tokens';
import { useColors } from '../theme/ThemeContext';

export interface AppModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  /** NativeWind classes for the content container. */
  contentClassName?: string;
}

function AppModalInner({
  visible,
  onDismiss,
  children,
  contentClassName,
}: AppModalProps) {
  const colors = useColors();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{ marginHorizontal: spacing['2xl'] }}
      >
        <AnimatePresence>
          {visible && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                type: 'spring',
                damping: 18,
                stiffness: 200,
                mass: 0.8,
              }}
              className={contentClassName}
              style={{
                backgroundColor: colors.surface,
                borderRadius: componentTokens.modal.borderRadius,
                padding: componentTokens.modal.padding,
              }}
            >
              {children}
            </MotiView>
          )}
        </AnimatePresence>
      </Modal>
    </Portal>
  );
}

export const AppModal = memo(AppModalInner);
AppModal.displayName = 'AppModal';
