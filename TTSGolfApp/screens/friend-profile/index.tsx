/**
 * Friend Profile Screen – matches design: banner, card, 3 states (Add / Requested / Message+More),
 * Friends-only lock when not friends, full profile when accepted.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useFriendProfile } from "./hooks/useFriendProfile";
import {
  ProfileBanner,
  ProfileInfo,
  ActionButtons,
  FriendsOnlyLock,
  PlayingPreferences,
  ActiveMemberships,
  GolfStats,
  RecentRounds,
} from "./components";
import {
  getInitials,
  getFullName,
  getPreferredTeeTimeDisplay,
  getWalkOrRideDisplay,
} from "./utils";
import { formatScore } from "../profile/utils";
import type { FriendProfileData } from "./types";
import type { DiscoveredUser } from "../../services/api";

interface Props {
  navigation: any;
  route: { params: { userId: string; user?: DiscoveredUser } };
}

function FriendProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, user: initialUser } = route.params;
  const [showMoreModal, setShowMoreModal] = useState(false);

  const {
    profile,
    loading,
    refreshing,
    actionLoading,
    onRefresh,
    handleAddFriend,
    handleAcceptRequest,
    handleRemoveFriend,
    handleMessage,
  } = useFriendProfile(userId, initialUser);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const onMessage = useCallback(() => {
    if (!profile) return;
    const fullName = getFullName(profile.firstName, profile.lastName);
    navigation.navigate("ChatDetail", {
      chatInfo: {
        id: profile.id,
        recipientId: profile.id,
        name: fullName,
        subtitle: "Active now",
        img: profile.avatar,
        isGroup: false,
      },
    });
  }, [navigation, profile]);

  const handleShowMoreModal = useCallback(() => {
    setShowMoreModal(true);
  }, []);

  const handleRemoveFriendConfirm = useCallback(() => {
    setShowMoreModal(false);
    handleRemoveFriend();
  }, [handleRemoveFriend]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg justify-center items-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#5EBC68" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-bg justify-center items-center px-4">
        <StatusBar style="dark" />
        <Text className="text-base text-text-secondary mb-4">User not found</Text>
        <TouchableOpacity className="py-2 px-4" onPress={handleBack}>
          <Text className="text-base font-medium text-primary">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName = getFullName(profile.firstName, profile.lastName);
  const initials = getInitials(profile.firstName, profile.lastName);
  const avatarUri = (profile.avatar || (profile as { avatarUrl?: string }).avatarUrl || "").trim() || undefined;
  const isFriend = profile.friendshipStatus === "friend";

  const rounds = profile.roundsCount ?? profile.roundsPlayed ?? 0;
  const courses = profile.coursesCount ?? 0;
  const socialScore = formatScore(profile.socialRate);
  const recentRounds = profile.recentRounds ?? [];
  const membershipName = profile.homeCourse ?? "No clubs added";
  const membershipLocation = profile.location;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: '#F3F4F6' }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5EBC68" />
        }
      >
        <ProfileBanner
          avatar={avatarUri}
          initials={initials}
          headerImageUri={profile.headerImage}
          topInset={insets.top}
          onBack={handleBack}
        />

        {/* Profile Card - Starting right after background */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          paddingTop: 70,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <ProfileInfo
            fullName={fullName}
            location={profile.location}
            handicap={profile.handicap}
          />
          <ActionButtons
            status={profile.friendshipStatus}
            loading={actionLoading}
            fullName={fullName}
            onAddFriend={handleAddFriend}
            onAcceptRequest={handleAcceptRequest}
            onRemoveFriend={handleRemoveFriend}
            onMessage={onMessage}
            onShowMoreModal={handleShowMoreModal}
          />
        </View>

        {!isFriend ? (
          <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <FriendsOnlyLock fullName={fullName} />
          </View>
        ) : (
          <>
            {/* Playing Preferences and Active Memberships in one white container */}
            <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}>
                <PlayingPreferences
                  teeTimePreference={getPreferredTeeTimeDisplay(profile.preferredTeeTime)}
                  walkOrRide={getWalkOrRideDisplay(profile.walkOrRide)}
                  golfVibe={profile.golfVibe}
                  drinkOfChoice={profile.drinkOfChoice}
                />
                
                {/* Separator Line */}
                <View style={{
                  height: 1,
                  backgroundColor: '#E5E7EB',
                  marginVertical: 20,
                }} />
                
                <ActiveMemberships clubName={membershipName} location={membershipLocation} />
              </View>
            </View>
            
            <GolfStats rounds={rounds} courses={courses} socialScore={socialScore} />
            <RecentRounds rounds={recentRounds} />
          </>
        )}
      </ScrollView>

      {/* More Modal */}
      <Modal
        visible={showMoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Text style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 18,
                color: '#111827',
              }}>
                More options
              </Text>
              <TouchableOpacity onPress={() => setShowMoreModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={{
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: '#FEE2E2',
                alignItems: 'center',
              }}
              onPress={handleRemoveFriendConfirm}
              activeOpacity={0.7}
            >
              <Text style={{
                fontFamily: 'Inter_600SemiBold',
                fontSize: 15,
                color: '#DC2626',
              }}>
                Remove friend
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default FriendProfileScreen;
