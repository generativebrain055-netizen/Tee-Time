import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Calendar, MessageSquare } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { RosterPerson } from "./types";
import { ROSTER_DATA } from "./mockData";

interface RosterListProps {
    onPersonClick: (person: RosterPerson) => void;
}

export default function RosterList({ onPersonClick }: RosterListProps) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {ROSTER_DATA.map((person, index) => (
                <TouchableOpacity
                    key={person.id}
                    style={styles.rosterItem}
                    onPress={() => onPersonClick(person)}
                >
                    <Text style={styles.rosterNumber}>{index + 1}</Text>
                    <Image source={{ uri: person.img }} style={styles.avatar} />
                    <View style={styles.rosterInfo}>
                        <Text style={styles.rosterName}>{person.name}</Text>
                        <Text style={styles.rosterSub}>{person.sub}</Text>
                    </View>
                    <View style={styles.rosterActions}>
                        <TouchableOpacity style={styles.actionBtnGreen}>
                            <Calendar size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnBlue}>
                            <MessageSquare size={18} color="#3B82F6" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    rosterItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F9FAFB",
    },
    rosterNumber: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
        width: 24,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.divider,
    },
    rosterInfo: {
        flex: 1,
        marginLeft: 12,
    },
    rosterName: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    rosterSub: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    rosterActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionBtnGreen: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#E8F5E9",
        justifyContent: "center",
        alignItems: "center",
    },
    actionBtnBlue: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: "#E3F2FD",
        justifyContent: "center",
        alignItems: "center",
    },
});
