import React from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from "react-native";
import { Check } from "lucide-react-native";
import { COLORS } from "./constants";
import { Friend } from "../../services/api";

interface SelectPlayersStepProps {
    friends: Friend[];
    selectedPlayers: string[];
    groupSize: number;
    onTogglePlayer: (id: string) => void;
}

export default function SelectPlayersStep({
    friends,
    selectedPlayers,
    groupSize,
    onTogglePlayer,
}: SelectPlayersStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    return (
        <View className="flex-1 px-5 pt-6">
            <Text className="text-base font-semibold text-[#1F2937] mb-5">
                Select players ({selectedPlayers.length}/{groupSize - 1})
            </Text>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {friends.map((friend) => {
                    const isSelected = selectedPlayers.includes(friend.id);
                    return (
                        <TouchableOpacity
                            key={friend.id}
                            className={`flex-row items-center p-3 rounded-md mb-2 ${
                                isSelected ? "bg-primary-100" : "bg-bg-muted"
                            }`}
                            onPress={() => onTogglePlayer(friend.id)}
                        >
                            <View className="mr-3">
                                {friend.avatar ? (
                                    <Image source={{ uri: friend.avatar }} className="w-12 h-12 rounded-full" />
                                ) : (
                                    <View className="w-12 h-12 rounded-full bg-primary justify-center items-center">
                                        <Text className="text-base font-semibold text-white">
                                            {getInitials(friend.firstName, friend.lastName)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-[15px] font-semibold text-[#1F2937]">
                                    {friend.firstName} {friend.lastName}
                                </Text>
                                <Text className="text-[13px] text-[#9CA3AF] mt-0.5">
                                    {friend.handicap ? `HCP ${friend.handicap}` : friend.homeCourse || "Golf buddy"}
                                </Text>
                            </View>
                            <View className={`w-6 h-6 rounded-full justify-center items-center ${
                                isSelected ? "bg-primary border-primary" : "border-2 border-border"
                            }`}>
                                {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                            </View>
                        </TouchableOpacity>
                    );
                })}
                {friends.length === 0 && (
                    <View className="items-center py-10">
                        <Text className="text-base font-semibold text-[#1F2937] mb-2">No friends yet</Text>
                        <Text className="text-sm text-[#9CA3AF] text-center px-5">
                            Add friends from the Availability screen to invite them to tee times
                        </Text>
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}
