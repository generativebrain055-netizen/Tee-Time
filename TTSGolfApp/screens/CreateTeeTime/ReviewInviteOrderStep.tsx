import React, { useMemo, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Image,
} from "react-native";
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GripVertical, Minus, Phone } from "lucide-react-native";
import { Friend } from "../../services/api";

export interface PhoneInviteEntry {
    phone: string;
    name: string;
}

/** Single draggable row: roster friend or phone invite (order is global). */
type OrderRow =
    | { kind: "player"; id: string; friend: Friend }
    | { kind: "phone"; phone: string; name: string };

interface ReviewInviteOrderStepProps {
    friends: Friend[];
    orderedPlayers: string[];
    onReorderPlayers: (orderedIds: string[]) => void;
    /** Keep phone invite order in sync when user drags phone rows among friends. */
    onReorderPhoneInvites: (entries: PhoneInviteEntry[]) => void;
    teeDate: string;
    teeTime: string;
    courseName: string;
    groupSize: number; // maxPlayers - used to determine initial vs backup invites
    /** Phone-only invitees (e.g. from "Invite via phone number") */
    phoneInvites?: PhoneInviteEntry[];
    onRemovePhoneInvite?: (phone: string) => void;
    /** Opens "Add more" modal (Select from players / Invite via phone number) */
    onAddMore?: () => void;
}

export default function ReviewInviteOrderStep({
    friends,
    orderedPlayers,
    onReorderPlayers,
    onReorderPhoneInvites,
    teeDate,
    teeTime,
    courseName,
    groupSize,
    phoneInvites = [],
    onRemovePhoneInvite,
    onAddMore,
}: ReviewInviteOrderStepProps) {
    const getInitials = (firstName: string, lastName: string): string => {
        return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    };

    const listData = useMemo((): OrderRow[] => {
        const rows: OrderRow[] = [];
        orderedPlayers.forEach((id) => {
            const friend = friends.find((f) => f.id === id);
            if (friend) rows.push({ kind: "player", id, friend });
        });
        phoneInvites.forEach((p) => {
            rows.push({ kind: "phone", phone: p.phone, name: p.name });
        });
        return rows;
    }, [orderedPlayers, friends, phoneInvites]);

    const handleDragEnd = useCallback(
        ({ data }: { data: OrderRow[] }) => {
            const newPlayerIds: string[] = [];
            const newPhones: PhoneInviteEntry[] = [];
            data.forEach((row) => {
                if (row.kind === "player") newPlayerIds.push(row.id);
                else newPhones.push({ phone: row.phone, name: row.name });
            });
            onReorderPlayers(newPlayerIds);
            onReorderPhoneInvites(newPhones);
        },
        [onReorderPlayers, onReorderPhoneInvites],
    );

    const handleRemovePlayer = useCallback(
        (itemId: string) => {
            const newOrder = orderedPlayers.filter((id) => id !== itemId);
            onReorderPlayers(newOrder);
        },
        [orderedPlayers, onReorderPlayers],
    );

    const keyExtractor = useCallback((item: OrderRow) => {
        return item.kind === "player" ? item.id : `phone:${item.phone}`;
    }, []);

    const renderItem = useCallback(
        ({ item, drag, isActive, getIndex }: RenderItemParams<OrderRow>) => {
            const index = getIndex?.() ?? 0;
            const displayOrder = index + 1;
            const initialInviteCount = Math.max(0, groupSize - 1);
            const isInitialInvite = displayOrder <= initialInviteCount;

            const cardStyle = {
                backgroundColor: "#FFFFFF" as const,
                borderRadius: 8,
                marginBottom: 12,
                paddingVertical: 16,
                paddingHorizontal: 16,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                shadowColor: isActive ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.15 : 0,
                shadowRadius: 8,
                elevation: isActive ? 5 : 0,
                opacity: isActive ? 0.9 : 1,
            };

            if (item.kind === "phone") {
                return (
                    <ScaleDecorator>
                        <View style={cardStyle}>
                            <TouchableOpacity
                                onPressIn={drag}
                                style={{ padding: 4, marginRight: 8 }}
                                activeOpacity={0.7}
                            >
                                <GripVertical size={20} color="#9CA3AF" strokeWidth={2} />
                            </TouchableOpacity>
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: isInitialInvite ? "#22C55E" : "#D1D5DB",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginLeft: 4,
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "Inter_600SemiBold",
                                        fontSize: 14,
                                        color: isInitialInvite ? "#FFFFFF" : "#374151",
                                    }}
                                >
                                    {displayOrder}
                                </Text>
                            </View>
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: "#E5E7EB",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginLeft: 12,
                                }}
                            >
                                <Phone size={24} color="#6B7280" strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text
                                    style={{
                                        fontFamily: "Inter_600SemiBold",
                                        fontSize: 16,
                                        color: "#111827",
                                    }}
                                >
                                    {item.phone}
                                </Text>
                                {item.name ? (
                                    <Text
                                        style={{
                                            fontFamily: "Inter_400Regular",
                                            fontSize: 13,
                                            color: "#6B7280",
                                            marginTop: 2,
                                        }}
                                    >
                                        {item.name}
                                    </Text>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: "#F3F4F6",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                                onPress={() => onRemovePhoneInvite?.(item.phone)}
                                activeOpacity={0.7}
                            >
                                <Minus size={18} color="#6B7280" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    </ScaleDecorator>
                );
            }

            const f = item.friend;
            return (
                <ScaleDecorator>
                    <View style={cardStyle}>
                        <TouchableOpacity
                            onPressIn={drag}
                            style={{
                                padding: 4,
                                marginRight: 8,
                            }}
                            activeOpacity={0.7}
                        >
                            <GripVertical size={20} color="#9CA3AF" strokeWidth={2} />
                        </TouchableOpacity>

                        <View
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isInitialInvite ? "#22C55E" : "#D1D5DB",
                                justifyContent: "center",
                                alignItems: "center",
                                marginLeft: 4,
                            }}
                        >
                            <Text
                                style={{
                                    fontFamily: "Inter_600SemiBold",
                                    fontSize: 14,
                                    color: isInitialInvite ? "#FFFFFF" : "#374151",
                                }}
                            >
                                {displayOrder}
                            </Text>
                        </View>

                        {f.avatar ? (
                            <Image
                                source={{ uri: f.avatar }}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    marginLeft: 12,
                                }}
                            />
                        ) : (
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: "#22C55E",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginLeft: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "Inter_600SemiBold",
                                        fontSize: 16,
                                        color: "#FFFFFF",
                                    }}
                                >
                                    {getInitials(f.firstName, f.lastName)}
                                </Text>
                            </View>
                        )}

                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text
                                style={{
                                    fontFamily: "Inter_600SemiBold",
                                    fontSize: 16,
                                    color: "#111827",
                                }}
                            >
                                {f.firstName} {f.lastName}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: "#F3F4F6",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                            onPress={() => handleRemovePlayer(item.id)}
                            activeOpacity={0.7}
                        >
                            <Minus size={18} color="#6B7280" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                </ScaleDecorator>
            );
        },
        [groupSize, handleRemovePlayer, onRemovePhoneInvite],
    );

    const listFooter = useMemo(() => {
        if (onAddMore == null) return <View style={{ height: 100 }} />;
        return (
            <>
                <TouchableOpacity
                    onPress={onAddMore}
                    style={{ paddingVertical: 16, alignItems: "center" }}
                    activeOpacity={0.7}
                >
                    <Text
                        style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 15,
                            color: "#3B82F6",
                        }}
                    >
                        + Add more
                    </Text>
                </TouchableOpacity>
                <View style={{ height: 100 }} />
            </>
        );
    }, [onAddMore]);

    return (
        <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
            <View
                style={{
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 16,
                    backgroundColor: "#FFFFFF",
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                }}
            >
                <Text
                    style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#6B7280",
                        textAlign: "center",
                        marginBottom: 4,
                    }}
                >
                    {teeDate} - {teeTime}
                </Text>
                <Text
                    style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#6B7280",
                        textAlign: "center",
                    }}
                >
                    {courseName}
                </Text>
            </View>

            <View
                style={{
                    paddingHorizontal: 20,
                    paddingTop: 20,
                    paddingBottom: 12,
                }}
            >
                <Text
                    style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        color: "#6B7280",
                        textAlign: "center",
                    }}
                >
                    Review and customize your invite order
                </Text>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <DraggableFlatList
                    data={listData}
                    onDragEnd={handleDragEnd}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    ListFooterComponent={listFooter}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                    activationDistance={10}
                    animationConfig={{
                        damping: 20,
                        stiffness: 100,
                    }}
                />
            </View>
        </View>
    );
}
