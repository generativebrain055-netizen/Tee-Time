import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from "react-native";
import { Calendar, Clock } from "lucide-react-native";
import { COLORS } from "./constants";

interface InviteDetailsStepProps {
    selectedDate: Date | null;
    selectedTime: string | null;
    location: string;
    groupSize: number;
    onOpenDatePicker: () => void;
    onOpenTimePicker: () => void;
    onLocationChange: (text: string) => void;
    onGroupSizeChange: (size: number) => void;
}

const formatDateDisplay = (date: Date | null) => {
    if (!date) return "YYYY-MM-DD";
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export default function InviteDetailsStep({
    selectedDate,
    selectedTime,
    location,
    groupSize,
    onOpenDatePicker,
    onOpenTimePicker,
    onLocationChange,
    onGroupSizeChange,
}: InviteDetailsStepProps) {
    return (
        <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Date Picker */}
            <Text style={styles.label}>Pick a date</Text>
            <TouchableOpacity style={styles.inputBox} onPress={onOpenDatePicker}>
                <Text style={[styles.inputText, !selectedDate && styles.placeholder]}>
                    {formatDateDisplay(selectedDate)}
                </Text>
                <Calendar size={20} color={COLORS.textSub} strokeWidth={1.5} />
            </TouchableOpacity>

            {/* Time Picker */}
            <Text style={styles.label}>Pick a time</Text>
            <TouchableOpacity style={styles.inputBox} onPress={onOpenTimePicker}>
                <Text style={[styles.inputText, !selectedTime && styles.placeholder]}>
                    {selectedTime || "10:00 AM"}
                </Text>
                <Clock size={20} color={COLORS.textSub} strokeWidth={1.5} />
            </TouchableOpacity>

            {/* Location Input - Simple text input */}
            <Text style={styles.label}>Pick a location</Text>
            <View style={styles.inputBox}>
                <TextInput
                    style={styles.textInput}
                    placeholder="Enter golf course name"
                    placeholderTextColor={COLORS.textSub}
                    value={location}
                    onChangeText={onLocationChange}
                    autoCorrect={false}
                    returnKeyType="done"
                />
            </View>

            {/* Group Size */}
            <Text style={styles.label}>Group size</Text>
            <View style={styles.groupSizeContainer}>
                {[2, 3, 4].map((size, index) => (
                    <TouchableOpacity
                        key={size}
                        style={[
                            styles.groupSizeOption,
                            index === 0 && styles.groupSizeFirst,
                            index === 2 && styles.groupSizeLast,
                            groupSize === size && styles.groupSizeSelected,
                        ]}
                        onPress={() => onGroupSizeChange(size)}
                    >
                        <Text
                            style={[
                                styles.groupSizeNumber,
                                groupSize === size && styles.groupSizeNumberSelected,
                            ]}
                        >
                            {size}
                        </Text>
                        <Text
                            style={[
                                styles.groupSizeLabel,
                                groupSize === size && styles.groupSizeLabelSelected,
                            ]}
                        >
                            Players
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ height: 120 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 12,
        marginTop: 24,
    },
    inputBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    inputText: {
        fontSize: 16,
        color: COLORS.text,
    },
    placeholder: {
        color: COLORS.textSub,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        padding: 0,
    },
    groupSizeContainer: {
        flexDirection: "row",
    },
    groupSizeOption: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
        borderLeftWidth: 0,
    },
    groupSizeFirst: {
        borderLeftWidth: 1,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    groupSizeLast: {
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    groupSizeSelected: {
        borderColor: COLORS.text,
        borderWidth: 2,
        borderLeftWidth: 2,
        backgroundColor: COLORS.white,
    },
    groupSizeNumber: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.text,
    },
    groupSizeNumberSelected: {
        color: COLORS.text,
    },
    groupSizeLabel: {
        fontSize: 12,
        color: COLORS.textSub,
        marginTop: 2,
    },
    groupSizeLabelSelected: {
        color: COLORS.text,
    },
});
