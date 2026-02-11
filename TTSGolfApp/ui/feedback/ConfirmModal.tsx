/**
 * ConfirmModal — Custom iOS-style confirmation dialog
 * 
 * Usage:
 *   <ConfirmModal
 *     visible={showModal}
 *     title="Remove friend?"
 *     message="You'll no longer be friends and won't see each other in your roster or On-Deck."
 *     confirmText="Remove friend"
 *     cancelText="Cancel"
 *     confirmColor="#EF4444"
 *     onConfirm={handleConfirm}
 *     onCancel={handleCancel}
 *   />
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModalInner({
  visible,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  confirmColor = "#EF4444",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <AnimatePresence>
        {visible && (
          <>
            {/* Backdrop */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 200 }}
              style={styles.backdrop}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={onCancel}
              />
            </MotiView>

            {/* Modal Content */}
            <View style={styles.container}>
              <MotiView
                from={{ opacity: 0, scale: 0.9, translateY: 20 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.95, translateY: 10 }}
                transition={{
                  type: 'spring',
                  damping: 20,
                  stiffness: 300,
                }}
                style={styles.modal}
              >
                {/* Title */}
                <Text style={styles.title}>{title}</Text>

                {/* Message */}
                <Text style={styles.message}>{message}</Text>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onCancel}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>{cancelText}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: confirmColor }]}
                    onPress={onConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmText}>{confirmText}</Text>
                  </TouchableOpacity>
                </View>
              </MotiView>
            </View>
          </>
        )}
      </AnimatePresence>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 560,
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#111827',
  },
  confirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export const ConfirmModal = memo(ConfirmModalInner);
ConfirmModal.displayName = 'ConfirmModal';
