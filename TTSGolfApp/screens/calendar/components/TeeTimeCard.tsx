import React, { memo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { Clock, MapPin, Users, X } from "lucide-react-native";
import { TeeTime } from "../types";
import { CALENDAR_COLORS } from "../constants";
import { attendanceApi } from "../../../services/api";

interface TeeTimeCardProps {
  teeTime: TeeTime;
  onPress?: (teeTimeId: string) => void;
  onCancelSuccess?: () => void;
}

const CANCEL_PENALTY_CONFIRMED = 10;
const CANCEL_PENALTY_LATE = 5;

const getStatusConfig = (status: string) => {
  switch (status) {
    case "confirmed":
      return {
        label: "✓ Confirmed",
        bgColor: CALENDAR_COLORS.confirmedBg,
        textColor: CALENDAR_COLORS.confirmedText,
      };
    case "completed":
      return {
        label: "✓ Completed",
        bgColor: "#E0E0E0",
        textColor: "#616161",
      };
    case "cancelled":
      return {
        label: "✗ Cancelled",
        bgColor: "#FFEBEE",
        textColor: "#C62828",
      };
    case "pending":
    default:
      return {
        label: "⏱ Pending",
        bgColor: CALENDAR_COLORS.pendingBg,
        textColor: CALENDAR_COLORS.pendingText,
      };
  }
};

const TeeTimeCard = memo(
  ({ teeTime, onPress, onCancelSuccess }: TeeTimeCardProps) => {
    const statusConfig = getStatusConfig(teeTime.status);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const handlePress = useCallback(() => {
      onPress?.(teeTime.id);
    }, [onPress, teeTime.id]);

    const handleCancelPress = useCallback(() => {
      setShowCancelModal(true);
    }, []);

    const handleConfirmCancel = useCallback(async () => {
      setIsCancelling(true);
      try {
        console.log("Calling cancelParticipation for teeTimeId:", teeTime.id);
        const response = await attendanceApi.cancelParticipation(teeTime.id);
        console.log("Cancel response:", JSON.stringify(response));
        setShowCancelModal(false);
        Alert.alert(
          "Cancelled",
          response.message || "Your tee time has been cancelled."
        );
        onCancelSuccess?.();
      } catch (error: any) {
        console.error("Cancel error:", error);
        console.error("Cancel error message:", error?.message);
        const message =
          error?.message || "Failed to cancel tee time. Please try again.";
        Alert.alert("Error", message);
      } finally {
        setIsCancelling(false);
      }
    }, [teeTime.id, onCancelSuccess]);

    const handleCloseModal = useCallback(() => {
      setShowCancelModal(false);
    }, []);

    const canCancel =
      teeTime.status === "confirmed" || teeTime.status === "pending";

    return (
      <>
        <TouchableOpacity
          style={styles.card}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.header}>
            <View style={styles.timeRow}>
              <Clock size={16} color={CALENDAR_COLORS.textSecondary} />
              <Text style={styles.timeText}>{teeTime.time}</Text>
            </View>
            <View
              style={[styles.badge, { backgroundColor: statusConfig.bgColor }]}
            >
              <Text
                style={[styles.badgeText, { color: statusConfig.textColor }]}
              >
                {statusConfig.label}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={16} color={CALENDAR_COLORS.textSecondary} />
            <View style={styles.locationText}>
              <Text style={styles.courseName}>{teeTime.course}</Text>
              <Text style={styles.address}>{teeTime.location}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <View style={styles.playersRow}>
              <Users size={16} color={CALENDAR_COLORS.textSecondary} />
              <Text style={styles.playersText}>{teeTime.players} players</Text>
            </View>

            {canCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelPress}
                activeOpacity={0.7}
              >
                <X size={14} color="#C62828" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        <Modal
          visible={showCancelModal}
          transparent
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cancel Tee Time?</Text>
              <Text style={styles.modalMessage}>
                {teeTime.status === "confirmed"
                  ? `You will lose ${CANCEL_PENALTY_CONFIRMED} points if you cancel your Tee Time now. Confirm cancellation?`
                  : "Are you sure you want to cancel your participation in this tee time?"}
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.noButton]}
                  onPress={handleCloseModal}
                  disabled={isCancelling}
                >
                  <Text style={styles.noButtonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.yesButton]}
                  onPress={handleConfirmCancel}
                  disabled={isCancelling}
                >
                  <Text style={styles.yesButtonText}>
                    {isCancelling ? "Cancelling..." : "Yes"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: CALENDAR_COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: CALENDAR_COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    fontSize: 17,
    fontWeight: "700",
    color: CALENDAR_COLORS.text,
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  locationText: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "700",
    color: CALENDAR_COLORS.text,
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: CALENDAR_COLORS.textSecondary,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playersText: {
    fontSize: 14,
    fontWeight: "500",
    color: CALENDAR_COLORS.textSecondary,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFEBEE",
    borderRadius: 100,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#C62828",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Lighter overlay
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: CALENDAR_COLORS.white,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: CALENDAR_COLORS.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: CALENDAR_COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  noButton: {
    backgroundColor: "#F2F2F7",
  },
  noButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: CALENDAR_COLORS.text,
  },
  yesButton: {
    backgroundColor: "#C62828",
  },
  yesButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: CALENDAR_COLORS.white,
  },
});

export default TeeTimeCard;
