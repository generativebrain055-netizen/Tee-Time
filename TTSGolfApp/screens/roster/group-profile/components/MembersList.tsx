import React, { memo, useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, Modal, TouchableWithoutFeedback } from "react-native";
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
            <TouchableOpacity style={styles.card} onPress={onPress}>
                {member.contact?.avatar ? (
                    <Image source={{ uri: member.contact.avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    {member.contact?.handicap != null && (
                        <Text style={styles.handicap}>Handicap: {member.contact.handicap}</Text>
                    )}
                </View>
                {isOwner !== false ? (
                    <TouchableOpacity
                        style={styles.menuButton}
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
                    <View style={styles.menuOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.menuContainer}>
                                <Text style={styles.menuTitle}>{name}</Text>

                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setShowMenu(false);
                                        onPress();
                                    }}
                                >
                                    <ChevronRight size={20} color={COLORS.textMain} />
                                    <Text style={styles.menuItemText}>View Profile</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setShowMenu(false);
                                        onRemove();
                                    }}
                                >
                                    <UserMinus size={20} color="#F59E0B" />
                                    <Text style={[styles.menuItemText, { color: "#F59E0B" }]}>Remove from Group</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.menuItem}
                                    onPress={() => {
                                        setShowMenu(false);
                                        onBlock();
                                    }}
                                >
                                    <Ban size={20} color="#EF4444" />
                                    <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Block User</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.menuItem, styles.menuItemCancel]}
                                    onPress={() => setShowMenu(false)}
                                >
                                    <Text style={styles.menuItemCancelText}>Cancel</Text>
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
    <View style={styles.section}>
        <View style={styles.header}>
            <Text style={styles.title}>Members ({members.length})</Text>
            {isOwner !== false && (
                <TouchableOpacity onPress={onAddPress}>
                    <Text style={styles.addText}>Add</Text>
                </TouchableOpacity>
            )}
        </View>

        {isOwner !== false && (
            <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
                <View style={styles.addIcon}>
                    <UserPlus size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.addButtonText}>Add people to group</Text>
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
            <View style={styles.empty}>
                <Text style={styles.emptyText}>No members yet</Text>
                <Text style={styles.emptySubtext}>Add friends to this group</Text>
            </View>
        )}

        {members.length > 5 && (
            <TouchableOpacity style={styles.viewAll}>
                <Text style={styles.viewAllText}>View all {members.length} members</Text>
            </TouchableOpacity>
        )}
    </View>
));

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    addText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        marginBottom: 8,
    },
    addIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.primary,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarInitials: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textMain,
        marginBottom: 2,
    },
    handicap: {
        fontSize: 13,
        color: COLORS.textSub,
    },
    empty: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 24,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 4,
    },
    viewAll: {
        alignItems: "center",
        paddingVertical: 12,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.primary,
    },
    menuButton: {
        padding: 4,
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        width: "100%",
        maxWidth: 320,
        overflow: "hidden",
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textMain,
        textAlign: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: "500",
        color: COLORS.textMain,
    },
    menuItemCancel: {
        justifyContent: "center",
        borderBottomWidth: 0,
        backgroundColor: "#F9FAFB",
    },
    menuItemCancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textSub,
    },
});

export default MembersList;
