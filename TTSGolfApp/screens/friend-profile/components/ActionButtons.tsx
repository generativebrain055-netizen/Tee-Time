import React, { memo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { UserPlus, Clock, MessageCircle, MoreHorizontal } from "lucide-react-native";
import { FriendshipStatus } from "../types";

interface Props {
  status?: FriendshipStatus;
  loading: boolean;
  fullName: string;
  onAddFriend: () => void;
  onAcceptRequest: () => void;
  onRemoveFriend: () => void;
  onMessage: () => void;
  onShowMoreModal: () => void;
}

const ActionButtons = memo(({
  status,
  loading,
  fullName,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onMessage,
  onShowMoreModal,
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
