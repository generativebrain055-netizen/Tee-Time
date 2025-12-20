import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { BottomNav } from "../../components/common";
import RosterList from "./RosterList";
import GroupsList from "./GroupsList";
import OnDeckList from "./OnDeckList";
import RequestsList from "./RequestsList";

const TABS = ["Roster", "Groups", "On Deck", "Requests"];

export default function RosterScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const initialTab = route?.params?.initialTab || "Roster";
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        if (route?.params?.initialTab) {
            setActiveTab(route.params.initialTab);
        }
    }, [route?.params?.initialTab]);

    const renderContent = () => {
        switch (activeTab) {
            case "Roster":
                return <RosterList navigation={navigation} />;
            case "Groups":
                return <GroupsList onGroupClick={() => { }} />;
            case "On Deck":
                return <OnDeckList navigation={navigation} />;
            case "Requests":
                return <RequestsList />;
            default:
                return <RosterList navigation={navigation} />;
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation?.goBack()}
                >
                    <ArrowLeft size={24} color={COLORS.textMain} strokeWidth={1.5} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Roster</Text>
                <View style={styles.headerSpacer} />
            </View>

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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
        width: 40,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    headerSpacer: {
        width: 40,
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
