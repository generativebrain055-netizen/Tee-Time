import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/colors";
import { BottomNav, Header } from "../../components/common";
import RosterList from "./RosterList";
import GroupsList from "./GroupsList";
import OnDeckList from "./OnDeckList";
import RequestsList from "./RequestsList";

const TABS = ["Roster", "Groups", "On Deck", "Requests"];

export default function RosterScreen({ navigation, route }: any) {
    const initialTab = route?.params?.initialTab || "Roster";
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (route?.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route?.params?.initialTab]);

    const handleGroupClick = (groupId: string) => {
        // Navigate to the new GroupProfileScreen
        navigation?.navigate("GroupProfile", { groupId });
    };

    const renderContent = () => {
        switch (activeTab) {
            case "Roster":
                return <RosterList navigation={navigation} />;
            case "Groups":
                return <GroupsList onGroupClick={handleGroupClick} />;
            case "On Deck":
                return <OnDeckList navigation={navigation} />;
            case "Requests":
                return <RequestsList />;
            default:
                return <RosterList navigation={navigation} />;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <Header title="Roster" onBack={() => navigation?.goBack()} />

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={styles.tabItem}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text
                            style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
                        >
                            {tab}
                        </Text>
                        {activeTab === tab && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {renderContent()}

            <BottomNav activeTab="Players" navigation={navigation} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    tabBar: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: COLORS.white,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        position: "relative",
        alignItems: "center",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    tabTextActive: {
        color: COLORS.textMain,
        fontWeight: "600",
    },
    tabIndicator: {
        position: "absolute",
        bottom: 0,
        left: 16,
        right: 16,
        height: 2,
        backgroundColor: COLORS.primary,
        borderRadius: 1,
    },
});
