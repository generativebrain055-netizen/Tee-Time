import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { Calendar, Search, MapPin, X } from "lucide-react-native";
import { COLORS, TIME_SLOTS } from "./constants";
import { courseApi, GolfCourse } from "../../services/api";

interface InviteDetailsStepProps {
    selectedDate: Date | null;
    selectedTime: string | null;
    location: string;
    groupSize: number;
    onOpenDatePicker: () => void;
    onSelectTime: (time: string) => void;
    onLocationChange: (text: string) => void;
    onGroupSizeChange: (size: number) => void;
    onCourseSelect?: (course: GolfCourse) => void;
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
    onSelectTime,
    onLocationChange,
    onGroupSizeChange,
    onCourseSelect,
}: InviteDetailsStepProps) {
    const [searchQuery, setSearchQuery] = useState(location);
    const [courses, setCourses] = useState<GolfCourse[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<GolfCourse | null>(null);

    const searchCourses = useCallback(async (query: string) => {
        if (query.length < 2) {
            setCourses([]);
            return;
        }
        setSearching(true);
        try {
            const response = await courseApi.searchCourses(query);
            if (response.success) {
                setCourses(response.courses);
            }
        } catch (error) {
            console.error("Course search error:", error);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && !selectedCourse) {
                searchCourses(searchQuery);
                setShowResults(true);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchCourses, selectedCourse]);

    const handleCourseSelect = (course: GolfCourse) => {
        setSelectedCourse(course);
        setSearchQuery(course.name);
        onLocationChange(course.name);
        setShowResults(false);
        setCourses([]);
        onCourseSelect?.(course);
    };

    const handleClearSelection = () => {
        setSelectedCourse(null);
        setSearchQuery("");
        onLocationChange("");
        setShowResults(false);
    };

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
        if (selectedCourse) setSelectedCourse(null);
        onLocationChange(text);
    };


    return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Pick a date</Text>
            <TouchableOpacity style={styles.inputBox} onPress={onOpenDatePicker}>
                <Text style={[styles.inputText, !selectedDate && styles.placeholder]}>
                    {formatDateDisplay(selectedDate)}
                </Text>
                <Calendar size={20} color={COLORS.textSub} />
            </TouchableOpacity>

            <Text style={styles.label}>Pick a time</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.timeScroll}
                contentContainerStyle={styles.timeScrollContent}
            >
                {TIME_SLOTS.map((time) => (
                    <TouchableOpacity
                        key={time}
                        style={[styles.timeSlot, selectedTime === time && styles.timeSlotSelected]}
                        onPress={() => onSelectTime(time)}
                    >
                        <Text style={[styles.timeSlotText, selectedTime === time && styles.timeSlotTextSelected]}>
                            {time}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.label}>Pick a location</Text>
            <View style={styles.searchContainer}>
                <View style={styles.inputBox}>
                    <Search size={20} color={COLORS.textSub} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for a golf course"
                        placeholderTextColor={COLORS.textSub}
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                        onFocus={() => !selectedCourse && setShowResults(true)}
                        blurOnSubmit={false}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {selectedCourse && (
                        <TouchableOpacity onPress={handleClearSelection} style={styles.clearButton}>
                            <X size={18} color={COLORS.textSub} />
                        </TouchableOpacity>
                    )}
                    {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
                </View>

                {showResults && courses.length > 0 && (
                    <View style={styles.resultsContainer}>
                        {courses.slice(0, 5).map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={styles.courseItem}
                                onPress={() => handleCourseSelect(course)}
                            >
                                <MapPin size={16} color={COLORS.primary} />
                                <View style={styles.courseInfo}>
                                    <Text style={styles.courseName} numberOfLines={1}>{course.name}</Text>
                                    <Text style={styles.courseAddress} numberOfLines={1}>{course.address}</Text>
                                </View>
                                {course.rating && (
                                    <Text style={styles.courseRating}>★ {course.rating.toFixed(1)}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <Text style={styles.label}>Group size</Text>
            <View style={styles.groupSizeContainer}>
                {[2, 3, 4].map((size) => (
                    <TouchableOpacity
                        key={size}
                        style={[styles.groupSizeOption, groupSize === size && styles.groupSizeSelected]}
                        onPress={() => onGroupSizeChange(size)}
                    >
                        <Text style={[styles.groupSizeNumber, groupSize === size && styles.groupSizeNumberSelected]}>
                            {size}
                        </Text>
                        <Text style={[styles.groupSizeLabel, groupSize === size && styles.groupSizeLabelSelected]}>
                            Players
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
}


const styles = StyleSheet.create({
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
    label: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 12, marginTop: 20 },
    inputBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputText: { fontSize: 15, color: COLORS.text },
    placeholder: { color: COLORS.textSub },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text, marginLeft: 10 },
    clearButton: { padding: 4 },
    searchContainer: { position: "relative", zIndex: 10 },
    resultsContainer: {
        position: "absolute",
        top: 56,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 100,
    },
    courseItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 10,
    },
    courseInfo: { flex: 1 },
    courseName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
    courseAddress: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
    courseRating: { fontSize: 13, fontWeight: "600", color: "#F59E0B" },
    timeScroll: { marginTop: 0 },
    timeScrollContent: { paddingRight: 20 },
    timeSlot: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: COLORS.white,
    },
    timeSlotSelected: { borderColor: COLORS.text, borderWidth: 2 },
    timeSlotText: { fontSize: 14, color: COLORS.text },
    timeSlotTextSelected: { fontWeight: "600" },
    groupSizeContainer: { flexDirection: "row", gap: 0 },
    groupSizeOption: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.white,
    },
    groupSizeSelected: { borderColor: COLORS.text, borderWidth: 2, backgroundColor: COLORS.white },
    groupSizeNumber: { fontSize: 18, fontWeight: "700", color: COLORS.text },
    groupSizeNumberSelected: { color: COLORS.text },
    groupSizeLabel: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
    groupSizeLabelSelected: { color: COLORS.text },
});
