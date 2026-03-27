import React, { memo } from "react";
import { View, Image, TouchableOpacity, Text } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { cn } from "../../../utils/cn";

interface Props {
  avatar?: string;
  initials: string;
  headerImageUri?: string;
  topInset: number;
  onBack: () => void;
}

const ProfileBanner = memo(({ avatar, initials, headerImageUri, topInset, onBack }: Props) => (
  <View style={{ position: 'relative', marginBottom: 0 }}>
    {/* Cover Image */}
    <View style={{ height: 140, width: '100%', overflow: 'hidden', backgroundColor: '#4CAF50' }}>
      {headerImageUri ? (
        <Image source={{ uri: headerImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Image
          source={require('../../../assets/profile-cover.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}
      <View style={{ position: 'absolute', top: topInset + 8, left: 16, zIndex: 30, elevation: 30 }}>
        <TouchableOpacity
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
            elevation: 30,
          }}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
    {/* Profile Photo - Centered and overlapping both cover and card */}
    <View style={{ 
      position: 'absolute',
      top: 80,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 10,
    }} pointerEvents="none">
      {avatar ? (
        <Image
          key={avatar}
          source={{ uri: avatar }}
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 5,
            borderColor: '#FFFFFF',
          }}
        />
      ) : (
        <View style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: '#5EBC68',
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 5,
          borderColor: '#FFFFFF',
        }}>
          <Text style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 36,
            color: '#FFFFFF',
          }}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  </View>
));

export default ProfileBanner;
