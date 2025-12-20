import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from "react-native";
import { X } from "lucide-react-native";
import { COLORS, HOURS, MINUTES, PERIODS } from "./constants";

interface TimePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    initialTime?: string;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

export default function TimePickerModal({
    visible,
    onClose,
    onSelect,
    initialTime,
}: TimePickerModalProps) {
    const [hour, setHour] = useState(10);
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");

    const hourRef = useRef<ScrollView>(null);
    const minuteRef = useRef<ScrollView>(null);
    const periodRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible && initialTime) {
            const match = initialTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (match) {
                setHour(parseInt(match[1]));
                setMinute(match[2]);
                setPeriod(match[3].toUpperCase());
            }
        }
    }, [visible, initialTime]);

    useEffect(() => {
        if (visible) {
            setTimeout(() => {
                const hourIndex = HOURS.indexOf(hour);
                const minuteIndex = MINUTES.indexOf(minute);
                const periodIndex = PERIODS.indexOf(period);

                hourRef.current?.scrollTo({ y: hourIndex * ITEM_HEIGHT, animated: false });
                minuteRef.current?.scrollTo({ y: minuteIndex * ITEM_HEIGHT, animated: false });
                periodRef.current?.scrollTo({ y: periodIndex * ITEM_HEIGHT, animated: false });
            }, 100);
        }
    }, [visible]);

    const handleDone = () => {
        const formattedTime = `${hour}:${minute} ${period}`;
        onSelect(formattedTime);
        onClose();
    };

    const handleScroll = (
        event: NativeSyntheticEvent<NativeScrollEvent>,
        items: (string | number)[],
        setter: (val: any) => void
    ) => {
        const y = event.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
        setter(items[clampedIndex]);
    };

    const renderColumn = (
        items: (string | number)[],
        selected: string | number,
        ref: React.RefObject<ScrollView>,
        onScrollEnd: (e: NativeSyntheticEvent<NativeScrollEvent>) => void
    ) => (
        <ScrollView
            ref={ref}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={onScrollEnd}
            contentContainerStyle={styles.columnContent}
            style={styles.column}
        >
            {items.map((item, index) => {
                const isSelected = item === selected;
                return (
                    <View key={index} style={styles.itemContainer}>
                        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                            {item}
                        </Text>
                    </View>
                );
            })}
        </ScrollView>
    );

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Time</Text>
                        <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                        <View style={styles.selectionIndicator} />
                        <View style={styles.columnsWrapper}>
                            {renderColumn(
                                HOURS,
                                hour,
                                hourRef,
                                (e) => handleScroll(e, HOURS, setHour)
                            )}
                            {renderColumn(
                                MINUTES,
                                minute,
                                minuteRef,
                                (e) => handleScroll(e, MINUTES, setMinute)
                            )}
                            {renderColumn(
                                PERIODS,
                                period,
                                periodRef,
                                (e) => handleScroll(e, PERIODS, setPeriod)
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 40,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerButton: {
        padding: 4,
        minWidth: 60,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        color: COLORS.text,
    },
    doneText: {
        fontSize: 17,
        fontWeight: "600",
        color: "#007AFF",
        textAlign: "right",
    },
    pickerContainer: {
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        position: "relative",
    },
    selectionIndicator: {
        position: "absolute",
        top: ITEM_HEIGHT * 2,
        left: 20,
        right: 20,
        height: ITEM_HEIGHT,
        backgroundColor: "#F2F2F7",
        borderRadius: 8,
        zIndex: 0,
    },
    columnsWrapper: {
        flexDirection: "row",
        justifyContent: "center",
        paddingHorizontal: 40,
        zIndex: 1,
    },
    column: {
        width: 70,
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
    },
    columnContent: {
        paddingVertical: ITEM_HEIGHT * 2,
    },
    itemContainer: {
        height: ITEM_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
    },
    itemText: {
        fontSize: 20,
        color: COLORS.textSub,
    },
    itemTextSelected: {
        color: COLORS.text,
        fontWeight: "600",
    },
});
