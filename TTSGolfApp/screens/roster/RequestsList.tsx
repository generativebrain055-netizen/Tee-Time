import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { UserPlus } from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { REQUESTS_DATA } from "./mockData";

export default function RequestsList() {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {REQUESTS_DATA.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                    <Image source={{ uri: req.img }} style={styles.avatar} />
                    <View style={styles.requestInfo}>
                        <Text style={styles.requestName}>{req.name}</Text>
                        <Text style={styles.requestMutual}>{req.mutual}</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton}>
                        <UserPlus size={18} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
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
    requestCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.divider,
    },
    requestInfo: {
        flex: 1,
        marginLeft: 12,
    },
    requestName: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.textMain,
    },
    requestMutual: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
    },
});
