import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { UserPlus, Clock, MessageCircle, MoreHorizontal, ShieldOff, Unlock, Ban } from "lucide-react-native";
import { FriendshipStatus } from "../types";

interface Props {
  status?: FriendshipStatus;
  /** Viewer has blocked this profile's user */
  isBlocked?: boolean;
  /** This profile's user has blocked the viewer */
  blockedYou?: boolean;
  loading: boolean;
  fullName: string;
  onAddFriend: () => void;
  onAcceptRequest: () => void;
  onRemoveFriend: () => void;
  onMessage: () => void;
  onShowMoreModal: () => void;
  onUnblock: () => void;
}

const ActionButtons = memo(({
  status,
  isBlocked,
  blockedYou,
  loading,
  fullName,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onMessage,
  onShowMoreModal,
  onUnblock,
}: Props) => {
  if (loading) {
    return (
      <View style={{ width: '100%', marginTop: 20 }}>
        <View style={{
          width: '100%',
          backgroundColor: '#5EBC68',
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (isBlocked) {
    return (
      <View style={{ width: "100%", marginTop: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: "#FEF2F2",
            borderWidth: 1,
            borderColor: "#FECACA",
            marginBottom: 12,
          }}
        >
          <ShieldOff size={18} color="#B91C1C" strokeWidth={2.2} />
          <Text
            style={{
              flex: 1,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              color: "#991B1B",
            }}
          >
            You blocked {fullName}. They cannot message or invite you until you unblock.
          </Text>
        </View>
        <TouchableOpacity
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: "#2563EB",
          }}
          onPress={onUnblock}
          activeOpacity={0.7}
        >
          <Unlock size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
              color: "#FFFFFF",
            }}
          >
            Unblock member
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (blockedYou) {
    return (
      <View style={{ width: "100%", marginTop: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: "#FFFBEB",
            borderWidth: 1,
            borderColor: "#FDE68A",
          }}
        >
          <Ban size={20} color="#B45309" strokeWidth={2.2} style={{ marginTop: 2 }} />
          <Text
            style={{
              flex: 1,
              fontFamily: "Inter_500Medium",
              fontSize: 14,
              lineHeight: 20,
              color: "#92400E",
            }}
          >
            {fullName} blocked you. You can’t message them or send friend requests until they unblock you.
          </Text>
        </View>
      </View>
    );
  }

  switch (status) {
    case "friend":
      return (
        <View style={{ width: '100%', marginTop: 20, flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: '#5EBC68',
            }}
            onPress={onMessage}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}>
              Message
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#D1D5DB',
              backgroundColor: '#FFFFFF',
            }}
            onPress={onShowMoreModal}
            activeOpacity={0.7}
          >
            <MoreHorizontal size={20} color="#6B7280" strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#6B7280',
            }}>
              More
            </Text>
          </TouchableOpacity>
        </View>
      );
    case "requested":
      return (
        <View style={{ width: '100%', marginTop: 20 }}>
          <View style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: '#5EBC68',
          }}>
            <Clock size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}>
              Requested
            </Text>
          </View>
        </View>
      );
    case "pending":
      return (
        <View style={{ width: '100%', marginTop: 20 }}>
          <TouchableOpacity
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: '#5EBC68',
            }}
            onPress={onAcceptRequest}
            activeOpacity={0.7}
          >
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}>
              Accept Request
            </Text>
          </TouchableOpacity>
        </View>
      );
    default:
      return (
        <View style={{ width: '100%', marginTop: 20 }}>
          <TouchableOpacity
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: '#5EBC68',
            }}
            onPress={onAddFriend}
            activeOpacity={0.7}
          >
            <UserPlus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 15,
              color: '#FFFFFF',
            }}>
              Add friend
            </Text>
          </TouchableOpacity>
        </View>
      );
  }
});

export default ActionButtons;
