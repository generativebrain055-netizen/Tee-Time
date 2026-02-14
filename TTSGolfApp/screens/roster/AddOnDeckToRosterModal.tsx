/**
 * Modal: Add On Deck users to Roster (Figma 795-2957, 795-3146)
 * Lists On Deck members, multi-select, "Add to roster" button.
 */
import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from "react-native";
import { X, Check } from "lucide-react-native";
import { useTheme } from "../../ui/theme";
import { rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";

const getInitials = (name: string): string => {
    const parts = (name || "").trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name || "").slice(0, 2).toUpperCase() || "?";
};

interface AddOnDeckToRosterModalProps {
    visible: boolean;
    onClose: () => void;
    onAdded: (movedRosterIds: string[]) => void;
    onRefreshRoster: () => void;
}

export default function AddOnDeckToRosterModal({
    visible,
    onClose,
    onAdded,
    onRefreshRoster,
}: AddOnDeckToRosterModalProps) {
    const theme = useTheme();
    const [onDeck, setOnDeck] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    const loadOnDeck = useCallback(async () => {
        if (!visible) return;
        setLoading(true);
        try {
            const res = await rosterApi.getOnDeck();
            if (res.success && res.onDeck) {
                setOnDeck(res.onDeck);
                setSelectedIds(new Set());
            }
        } catch (e) {
            logger.error("[AddOnDeckToRosterModal] Failed to load on-deck", e);
            setOnDeck([]);
        } finally {
            setLoading(false);
        }
    }, [visible]);

    useEffect(() => {
        if (visible) loadOnDeck();
    }, [visible, loadOnDeck]);

    const toggle = useCallback((rosterId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(rosterId)) next.delete(rosterId);
            else next.add(rosterId);
            return next;
        });
    }, []);

    const handleAddToRoster = useCallback(async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        setAdding(true);
        try {
            const rosterRes = await rosterApi.getRoster();
            const rosterLength = (rosterRes.success && rosterRes.roster) ? rosterRes.roster.length : 0;
            const movedIds: string[] = [];
            for (let i = 0; i < ids.length; i++) {
                await rosterApi.moveMember(ids[i], {
                    isOnDeck: false,
                    newPosition: rosterLength + i,
                });
                movedIds.push(ids[i]);
            }
            onAdded(movedIds);
            onRefreshRoster();
            onClose();
        } catch (e) {
            logger.error("[AddOnDeckToRosterModal] Add to roster failed", e);
        } finally {
            setAdding(false);
        }
    }, [selectedIds, onAdded, onRefreshRoster, onClose]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "flex-end",
                }}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: "#FFFFFF",
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        maxHeight: "80%",
                    }}
                >
                    {/* Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 18, color: "#111827" }}>
                            Add to Roster
                        </Text>
                        <TouchableOpacity onPress={onClose} hitSlop={12}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ padding: 40, alignItems: "center" }}>
                            <ActivityIndicator size="large" color="#22C55E" />
                        </View>
                    ) : onDeck.length === 0 ? (
                        <View style={{ padding: 40, alignItems: "center" }}>
                            <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 15, color: "#6B7280", textAlign: "center" }}>
                                No one on deck. Add players from Find Players first.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 16 }}>
                                {onDeck.map((item) => {
                                    const contact = item.contact || item;
                                    const name = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || "Unknown";
                                    const avatar = contact.avatar || item.avatar;
                                    const isSelected = selectedIds.has(item.id);
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => toggle(item.id)}
                                            activeOpacity={0.7}
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                paddingVertical: 12,
                                                paddingHorizontal: 20,
                                            }}
                                        >
                                            {avatar ? (
                                                <Image source={{ uri: avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                                            ) : (
                                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
                                                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#6B7280" }}>{getInitials(name)}</Text>
                                                </View>
                                            )}
                                            <Text style={{ flex: 1, fontFamily: theme.fontFamily.medium, fontSize: 16, color: "#111827", marginLeft: 14 }} numberOfLines={1}>
                                                {name}
                                            </Text>
                                            <View
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 12,
                                                    borderWidth: 2,
                                                    borderColor: isSelected ? "#22C55E" : "#D1D5DB",
                                                    backgroundColor: isSelected ? "#22C55E" : "transparent",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={{ padding: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                                <TouchableOpacity
                                    onPress={adding ? undefined : handleAddToRoster}
                                    disabled={adding || selectedIds.size === 0}
                                    style={{
                                        backgroundColor: selectedIds.size > 0 && !adding ? "#22C55E" : "#D1D5DB",
                                        paddingVertical: 14,
                                        borderRadius: 12,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {adding ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#FFFFFF" }}>
                                            Add to roster {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}
