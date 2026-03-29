import React, { memo, useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from "react-native";
import { UserPlus, ChevronRight, MoreVertical, UserMinus, Ban } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";
import { RosterContact } from "../../../../services/api";
import { getMemberInitials } from "../utils";

interface MemberCardProps {
    member: RosterContact;
    displayName?: string;
    isOwner?: boolean;
    /** Current user — row is not tappable and does not open friend profile */
    isYou?: boolean;
    onPress: () => void;
    onRemove: () => void;
    onBlock: () => void;
}

const rowStyle = { flexDirection: "row" as const, alignItems: "center" as const, paddingVertical: 12, marginBottom: 8 };

const MemberCard = memo(({ member, displayName: displayNameProp, isOwner, isYou, onPress, onRemove, onBlock }: MemberCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const name = member.contact?.name || "Unknown";
    const displayName = displayNameProp ?? name;
    const initials = getMemberInitials(name);
    const showRemoveBlock =
        isOwner === true &&
        member.inviteStatus !== "pending" &&
        member.groupMemberRole !== "organizer";

    const rowContent = (
        <>
            {member.contact?.avatar ? (
                <Image source={{ uri: member.contact.avatar }} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 16 }} />
            ) : (
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                    <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 14, color: "#FFFFFF" }}>{initials}</Text>
                </View>
            )}
            <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 16, lineHeight: 19, color: "#000000" }} numberOfLines={1}>{displayName}</Text>
            </View>
            {!isYou && isOwner !== false ? (
                <TouchableOpacity
                    className="p-1"
                    onPress={() => setShowMenu(true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MoreVertical size={20} color={COLORS.textSub} />
                </TouchableOpacity>
            ) : !isYou ? (
                <ChevronRight size={20} color={COLORS.textSub} />
            ) : null}
        </>
    );

    return (
        <>
            {isYou ? (
                <View style={rowStyle}>{rowContent}</View>
            ) : (
                <TouchableOpacity style={rowStyle} onPress={onPress} activeOpacity={0.7}>
                    {rowContent}
                </TouchableOpacity>
            )}

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

                                {showRemoveBlock ? (
                                    <>
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
                                            <Text className="text-[15px] font-medium text-[#EF4444]">Block member</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : null}

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
    currentUserId?: string | null;
    isOwner?: boolean;
    onAddPress: () => void;
    onMemberPress: (member: RosterContact) => void;
    onRemoveMember?: (member: RosterContact) => void;
    onBlockMember?: (member: RosterContact) => void;
}

const MembersList = memo(({ members, currentUserId, isOwner, onAddPress, onMemberPress, onRemoveMember, onBlockMember }: Props) => (
    <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
        <Text style={{ fontFamily: "Inter", fontWeight: "600", fontSize: 18, lineHeight: 20, color: "#000000", marginBottom: 12 }}>People</Text>
        {isOwner !== false && (
            <TouchableOpacity onPress={onAddPress} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ width: 24, height: 24, marginRight: 8, alignItems: "center", justifyContent: "center" }}>
                    <UserPlus size={20} color="#2563EB" strokeWidth={2} />
                </View>
                <Text style={{ fontFamily: "Inter", fontWeight: "500", fontSize: 16, lineHeight: 20, color: "#2563EB" }}>Invite people to group</Text>
            </TouchableOpacity>
        )}

        {members.length > 0 ? (
            members.map((member) => {
                const isYou =
                    !!currentUserId &&
                    String(member.contact?.userId) === String(currentUserId);
                const base = isYou ? "You" : member.contact?.name || "Unknown";
                const suffix =
                    !isYou && member.inviteStatus === "pending"
                        ? " (pending)"
                        : !isYou && member.groupMemberRole === "organizer"
                          ? " · Organizer"
                          : "";
                const displayName = `${base}${suffix}`;
                return (
                    <MemberCard
                        key={member.id}
                        member={member}
                        displayName={displayName}
                        isOwner={isOwner}
                        isYou={isYou}
                        onPress={() => onMemberPress(member)}
                        onRemove={() => onRemoveMember?.(member)}
                        onBlock={() => onBlockMember?.(member)}
                    />
                );
            })
        ) : (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Text style={{ fontFamily: "Inter", fontWeight: "400", fontSize: 14, color: COLORS.textSub }}>No members yet</Text>
            </View>
        )}
    </View>
));


export default MembersList;
