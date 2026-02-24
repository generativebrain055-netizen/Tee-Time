import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
} from "react-native";
import { Plus, Search } from "lucide-react-native";
import { ScreenShell, AppHeader, AppBottomNav } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import { useTheme } from "../../ui/theme";
import SimpleRosterList from "./SimpleRosterList";
import SimpleGroupsList from "./SimpleGroupsList";
import RequestsList from "./RequestsList";
import OnDeckList from "./OnDeckList";
import AddOnDeckToRosterModal from "./AddOnDeckToRosterModal";
import { rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";

const TABS = ["Roster", "Groups", "On Deck", "Requests"];

export default function RosterScreen({ navigation, route }: any) {
    const initialTab = route?.params?.initialTab || "Roster";
    const [activeTab, setActiveTab] = useState(initialTab);
    const [removeMode, setRemoveMode] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addedToRosterUndo, setAddedToRosterUndo] = useState<string[] | null>(null);
    const [rosterRefreshKey, setRosterRefreshKey] = useState(0);
    const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);
    const addedUndoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const colors = useColors();
    const theme = useTheme();

    useEffect(() => {
        if (route?.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route?.params?.initialTab]);

    useEffect(() => {
        if (activeTab !== "Roster") setRemoveMode(false);
    }, [activeTab]);

    useEffect(() => {
        return () => {
            if (addedUndoTimeoutRef.current) clearTimeout(addedUndoTimeoutRef.current);
        };
    }, []);

    const handleRosterRefresh = useCallback(() => {
        setRosterRefreshKey((k) => k + 1);
    }, []);

    const handleAddedToRoster = useCallback((movedRosterIds: string[]) => {
        if (movedRosterIds.length === 0) return;
        if (addedUndoTimeoutRef.current) clearTimeout(addedUndoTimeoutRef.current);
        setAddedToRosterUndo(movedRosterIds);
        addedUndoTimeoutRef.current = setTimeout(() => {
            setAddedToRosterUndo(null);
            addedUndoTimeoutRef.current = null;
        }, 5000);
    }, []);

    const handleUndoAddedToRoster = useCallback(async () => {
        if (!addedToRosterUndo || addedToRosterUndo.length === 0) return;
        if (addedUndoTimeoutRef.current) {
            clearTimeout(addedUndoTimeoutRef.current);
            addedUndoTimeoutRef.current = null;
        }
        try {
            for (const rosterId of addedToRosterUndo) {
                await rosterApi.moveMember(rosterId, { isOnDeck: true });
            }
            setAddedToRosterUndo(null);
            setRosterRefreshKey((k) => k + 1);
        } catch (e) {
            logger.error("[RosterScreen] Undo add to roster failed", e);
        }
    }, [addedToRosterUndo]);

    const handleGroupClick = (groupId: string) => {
        navigation?.navigate("GroupProfile", { groupId });
    };

    const renderContent = () => {
        switch (activeTab) {
            case "Roster":
                return (
                    <SimpleRosterList
                        key={rosterRefreshKey}
                        navigation={navigation}
                        removeMode={removeMode}
                        onEnterRemoveMode={() => setRemoveMode(true)}
                        onExitRemoveMode={() => setRemoveMode(false)}
                        scrollToTopTrigger={scrollToTopTrigger}
                    />
                );
            case "Groups":
                return <SimpleGroupsList onGroupClick={handleGroupClick} navigation={navigation} />;
            case "On Deck":
                return <OnDeckList navigation={navigation} />;
            case "Requests":
                return <RequestsList />;
            default:
                return <SimpleRosterList navigation={navigation} />;
        }
    };

    const handleCreateGroup = () => {
        navigation?.navigate("CreateGroup");
    };

    const handleFindPlayers = () => {
        navigation?.navigate("FindPlayers");
    };

    const renderRightAction = () => {
        if (activeTab === "Roster") {
            if (removeMode) {
                return (
                    <TouchableOpacity
                        style={{ paddingHorizontal: 4 }}
                        onPress={() => {
                            setRemoveMode(false);
                            setScrollToTopTrigger((t) => t + 1);
                        }}
                    >
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#3B82F6" }}>
                            Done
                        </Text>
                    </TouchableOpacity>
                );
            }
            return (
                <TouchableOpacity
                    style={{ paddingHorizontal: 4, paddingVertical: 4 }}
                    onPress={() => setRemoveMode(true)}
                >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>
                        Edit
                    </Text>
                </TouchableOpacity>
            );
        }
        if (activeTab === "Groups") {
            return (
                <TouchableOpacity style={{ padding: 4 }} onPress={handleCreateGroup}>
                    <Plus size={24} color="#111827" strokeWidth={2} />
                </TouchableOpacity>
            );
        }
        if (activeTab === "On Deck") {
            return (
                <TouchableOpacity style={{ padding: 4 }} onPress={handleFindPlayers}>
                    <Search size={22} color="#111827" strokeWidth={2} />
                </TouchableOpacity>
            );
        }
        return null;
    };

    return (
        <ScreenShell>
            {/* Header */}
            <AppHeader 
                title="Roster" 
                onBack={() => navigation?.goBack()} 
                rightComponent={renderRightAction()}
            />

            {/* Tab Bar */}
            <View style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
                backgroundColor: "#FFFFFF",
            }}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={{
                            flex: 1,
                            paddingVertical: 14,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        onPress={() => setActiveTab(tab)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: activeTab === tab ? "600" : "400",
                                color: activeTab === tab ? "#111827" : "#9CA3AF",
                            }}
                        >
                            {tab}
                        </Text>
                        {activeTab === tab && (
                            <View 
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 2,
                                    backgroundColor: colors.primary,
                                }}
                            />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {renderContent()}

            <AddOnDeckToRosterModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onAdded={handleAddedToRoster}
                onRefreshRoster={handleRosterRefresh}
            />

            {/* Added to roster - Undo snackbar (Figma 795-2647) */}
            {addedToRosterUndo && addedToRosterUndo.length > 0 && (
                <View
                    style={{
                        position: "absolute",
                        left: 16,
                        right: 16,
                        bottom: 24,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#111827",
                        borderRadius: 12,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        elevation: 8,
                    }}
                >
                    <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 15, color: "#FFFFFF", flex: 1 }}>
                        Added to roster
                    </Text>
                    <TouchableOpacity
                        onPress={handleUndoAddedToRoster}
                        style={{ paddingVertical: 4, paddingHorizontal: 12 }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 15, color: "#60A5FA" }}>
                            Undo
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <AppBottomNav activeTab="Players" navigation={navigation} />
        </ScreenShell>
    );
}
