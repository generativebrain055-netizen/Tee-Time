import React, { memo, useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from "react-native";
import { UserPlus, ChevronRight, MoreVertical, UserMinus, Ban } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterContact } from "../../../../services/api";
import { getMemberInitials } from "../utils";

interface MemberCardProps {
    member: RosterContact;
    isOwner?: boolean;
    onPress: () => void;
    onRemove: () => void;
    onBlock: () => void;
}

const MemberCard = memo(({ member, isOwner, onPress, onRemove, onBlock }: MemberCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const name = member.contact?.name || "Unknown";
    const initials = getMemberInitials(name);

    return (
        <>
            <TouchableOpacity className="flex-row items-center rounded-md p-3 mb-2" style={{ backgroundColor: COLORS.white }} onPress={onPress}>
                {member.contact?.avatar ? (
                    <Image source={{ uri: member.contact.avatar }} className="w-11 h-11 rounded-full mr-3" />
                ) : (
                    <View className="w-11 h-11 rounded-full bg-gray-200 justify-center items-center mr-3">
                        <Text className="text-sm font-semibold" style={{ color: COLORS.textSub }}>{initials}</Text>
                    </View>
                )}
                <View className="flex-1">
                    <Text className="text-[15px] font-semibold mb-0.5" style={{ color: COLORS.textMain }} numberOfLines={1}>{name}</Text>
                    {member.contact?.handicap != null && (
                        <Text className="text-[13px]" style={{ color: COLORS.textSub }}>Handicap: {member.contact.handicap}</Text>
                    )}
                </View>
                {isOwner !== false ? (
                    <TouchableOpacity
                        className="p-1"
                        onPress={() => setShowMenu(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <MoreVertical size={20} color={COLORS.textSub} />
                    </TouchableOpacity>
                ) : (
                    <ChevronRight size={20} color={COLORS.textSub} />
                )}
            </TouchableOpacity>

            {/* Member Action Menu */}
            <Modal
                visible={showMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View className="flex-1 bg-black/50 justify-center items-center p-5">
                        <TouchableWithoutFeedback>
                            <View className="rounded-md w-full max-w-[320px] overflow-hidden" style={{ backgroundColor: COLORS.white }}>
                                <Text className="text-base font-bold text-center py-4 border-b border-gray-100" style={{ color: COLORS.textMain }}>{name}</Text>

                                <TouchableOpacity
                                    className="flex-row items-center gap-3 py-3.5 px-5 border-b border-gray-100"
                                    onPress={() => {
                                        setShowMenu(false);
                                        onPress();
                                    }}
                                >
                                    <ChevronRight size={20} color={COLORS.textMain} />
                                    <Text className="text-[15px] font-medium" style={{ color: COLORS.textMain }}>View Profile</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center gap-3 py-3.5 px-5 border-b border-gray-100"
                                    onPress={() => {
                                        setShowMenu(false);
                                        onRemove();
                                    }}
                                >
                                    <UserMinus size={20} color="#F59E0B" />
                                    <Text className="text-[15px] font-medium text-[#F59E0B]">Remove from Group</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center gap-3 py-3.5 px-5 border-b border-gray-100"
                                    onPress={() => {
                                        setShowMenu(false);
                                        onBlock();
                                    }}
                                >
                                    <Ban size={20} color="#EF4444" />
                                    <Text className="text-[15px] font-medium text-[#EF4444]">Block User</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center justify-center py-3.5 px-5 bg-gray-50"
                                    onPress={() => setShowMenu(false)}
                                >
                                    <Text className="text-[15px] font-semibold" style={{ color: COLORS.textSub }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
});

interface Props {
    members: RosterContact[];
    isOwner?: boolean;
    onAddPress: () => void;
    onMemberPress: (member: RosterContact) => void;
    onRemoveMember?: (member: RosterContact) => void;
    onBlockMember?: (member: RosterContact) => void;
}

const MembersList = memo(({ members, isOwner, onAddPress, onMemberPress, onRemoveMember, onBlockMember }: Props) => (
    <View className="px-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold" style={{ color: COLORS.textMain }}>Members ({members.length})</Text>
            {isOwner !== false && (
                <TouchableOpacity onPress={onAddPress}>
                    <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>Add</Text>
                </TouchableOpacity>
            )}
        </View>

        {isOwner !== false && (
            <TouchableOpacity className="flex-row items-center gap-3 py-3 mb-2" onPress={onAddPress}>
                <View className="w-11 h-11 rounded-full border-[1.5px] border-dashed justify-center items-center" style={{ borderColor: COLORS.primary }}>
                    <UserPlus size={18} color={COLORS.primary} />
                </View>
                <Text className="text-[15px] font-medium" style={{ color: COLORS.primary }}>Add people to group</Text>
            </TouchableOpacity>
        )}

        {members.length > 0 ? (
            members.slice(0, 5).map((member) => (
                <MemberCard
                    key={member.id}
                    member={member}
                    isOwner={isOwner}
                    onPress={() => onMemberPress(member)}
                    onRemove={() => onRemoveMember?.(member)}
                    onBlock={() => onBlockMember?.(member)}
                />
            ))
        ) : (
            <View className="rounded-md p-6 items-center" style={{ backgroundColor: COLORS.white }}>
                <Text className="text-sm font-medium" style={{ color: COLORS.textSub }}>No members yet</Text>
                <Text className="text-[13px] mt-1" style={{ color: COLORS.textSub }}>Add friends to this group</Text>
            </View>
        )}

        {members.length > 5 && (
            <TouchableOpacity className="items-center py-3">
                <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>View all {members.length} members</Text>
            </TouchableOpacity>
        )}
    </View>
));

export default MembersList;
