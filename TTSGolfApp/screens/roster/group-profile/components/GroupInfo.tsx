import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Users } from "lucide-react-native";
import { COLORS } from "../../../../constants/colors";

interface Props {
    name: string;
    description?: string;
    memberCount: number;
}

const GroupInfo = memo(({ name, description, memberCount }: Props) => (
    <View style={styles.container}>
        <Text style={styles.name}>{name}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
        <View style={styles.memberRow}>
            <Users size={14} color={COLORS.textSub} />
            <Text style={styles.memberText}>{memberCount} members</Text>
        </View>
    </View>
));

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    name: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.textMain,
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: COLORS.textSub,
        textAlign: "center",
        marginBottom: 8,
    },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    memberText: {
        fontSize: 14,
        color: COLORS.textSub,
    },
});

export default GroupInfo;
