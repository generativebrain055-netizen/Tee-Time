import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/colors";
import { BottomNav } from "../../components/common";
import { RosterPerson } from "./types";
import RosterList from "./RosterList";
import GroupsList from "./GroupsList";
import RequestsList from "./RequestsList";
import PersonDetail from "./PersonDetail";
import GroupDetail from "./GroupDetail";

export default function RosterScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState("Roster");
    const [showGroupDetail, setShowGroupDetail] = useState(false);
    const [showPersonDetail, setShowPersonDetail] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<RosterPerson | null>(null);

    const handlePersonClick = (person: RosterPerson) => {
        setSelectedPerson(person);
        setShowPersonDetail(true);
    };

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const handleGroupClick = (groupId: string) => {
        setSelectedGroupId(groupId);
        setShowGroupDetail(true);
    };

    const Header = () => (
        <View style={styles.header}>
            <View style={{ width: 40 }} />
            <Text style={styles.headerTitle}>Roster</Text>
            <TouchableOpacity>
                <Text style={styles.headerAction}>Edit</Text>
            </TouchableOpacity>
        </View>
    );

    const TabBar = () => {
        const tabs = ["Roster", "Groups", "Requests"];
        return (
            <View style={styles.tabBar}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={styles.tabItem}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                        {activeTab === tab && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case "Roster":
                return <RosterList onPersonClick={handlePersonClick} />;
            case "Groups":
                return <GroupsList onGroupClick={handleGroupClick} />;
            case "Requests":
                return <RequestsList />;
            default:
                return <RosterList onPersonClick={handlePersonClick} />;
        }
    };

    if (showPersonDetail && selectedPerson) {
        return <PersonDetail person={selectedPerson} onBack={() => setShowPersonDetail(false)} />;
    }

    if (showGroupDetail && selectedGroupId) {
        return <GroupDetail groupId={selectedGroupId} onBack={() => { setShowGroupDetail(false); setSelectedGroupId(null); }} />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <Header />
            <TabBar />
            {renderContent()}
            <BottomNav activeTab="Roster" navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    headerAction: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSub,
    },
    tabBar: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        backgroundColor: COLORS.white,
        paddingHorizontal: 8,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        position: "relative",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textSub,
        textAlign: "center",
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    tabIndicator: {
        position: "absolute",
        bottom: 0,
        left: 8,
        right: 8,
        height: 2,
        backgroundColor: COLORS.primary,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSub,
    },
});
