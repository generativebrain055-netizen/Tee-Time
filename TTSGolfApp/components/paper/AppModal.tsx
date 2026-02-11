/**
 * AppModal — Paper Modal / Portal wrapper with moti scale-in
 */
import React, { memo } from "react";
import { Modal, Portal } from "react-native-paper";
import { MotiView, AnimatePresence } from "moti";
import { transitions } from "../../theme/animations";

export interface AppModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  contentContainerClassName?: string;
}

function AppModalInner({
  visible,
  onDismiss,
  children,
  contentContainerClassName = "mx-6 p-6 bg-white rounded-2xl",
}: AppModalProps) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{ marginHorizontal: 24 }}
      >
        <AnimatePresence>
          {visible && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={transitions.spring}
              className={contentContainerClassName}
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
