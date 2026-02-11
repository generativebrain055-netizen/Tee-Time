import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
} from "react-native";
import { Plus, Search } from "lucide-react-native";
import { ScreenShell, AppHeader, AppBottomNav } from "../../ui";
import { useColors } from "../../ui/theme/ThemeContext";
import SimpleRosterList from "./SimpleRosterList";
import SimpleGroupsList from "./SimpleGroupsList";
import RequestsList from "./RequestsList";
import OnDeckList from "./OnDeckList";

const TABS = ["Roster", "Groups", "On Deck", "Requests"];

export default function RosterScreen({ navigation, route }: any) {
    const initialTab = route?.params?.initialTab || "Roster";
    const [activeTab, setActiveTab] = useState(initialTab);
    const colors = useColors();

    useEffect(() => {
        if (route?.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route?.params?.initialTab]);

    const handleGroupClick = (groupId: string) => {
        navigation?.navigate("GroupProfile", { groupId });
    };

    const renderContent = () => {
        switch (activeTab) {
            case "Roster":
                return <SimpleRosterList navigation={navigation} />;
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
            return (
                <TouchableOpacity style={{ paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#3B82F6" }}>
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

            <AppBottomNav activeTab="Players" navigation={navigation} />
        </ScreenShell>
    );
}
