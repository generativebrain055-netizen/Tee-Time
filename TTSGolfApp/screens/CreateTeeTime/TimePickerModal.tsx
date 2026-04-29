import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Pressable,
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
const PADDING_ROWS = 2;

function parseInitialTime(initialTime?: string): {
    hour: number;
    minute: string;
    period: string;
} {
    if (!initialTime) {
        return { hour: 10, minute: "00", period: "AM" };
    }
    const match = initialTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) {
        return { hour: 10, minute: "00", period: "AM" };
    }
    return {
        hour: parseInt(match[1], 10),
        minute: match[2],
        period: match[3].toUpperCase(),
    };
}

function scrollYForIndex(index: number) {
    return Math.max(0, index) * ITEM_HEIGHT;
}

function indexFromOffset(y: number, length: number) {
    const index = Math.round(y / ITEM_HEIGHT);
    return Math.max(0, Math.min(index, length - 1));
}

export default function TimePickerModal({
    visible,
    onClose,
    onSelect,
    initialTime,
}: TimePickerModalProps) {
    const [hour, setHour] = useState(10);
    const [minute, setMinute] = useState("00");
    const [period, setPeriod] = useState("AM");

    const hourRef = useRef<ScrollView | null>(null);
    const minuteRef = useRef<ScrollView | null>(null);
    const periodRef = useRef<ScrollView | null>(null);

    /** When modal opens: apply initial time and scroll columns (no dependency on hour while user is scrolling). */
    useEffect(() => {
        if (!visible) return;
        const { hour: h, minute: m, period: p } = parseInitialTime(initialTime);
        setHour(h);
        setMinute(m);
        setPeriod(p);

        const hi = Math.max(0, HOURS.indexOf(h));
        const mi = Math.max(0, MINUTES.indexOf(m));
        const pi = Math.max(0, PERIODS.indexOf(p));

        const t = setTimeout(() => {
            hourRef.current?.scrollTo({ y: scrollYForIndex(hi), animated: false });
            minuteRef.current?.scrollTo({ y: scrollYForIndex(mi), animated: false });
            periodRef.current?.scrollTo({ y: scrollYForIndex(pi), animated: false });
        }, 80);
        return () => clearTimeout(t);
    }, [visible, initialTime]);

    const handleDone = () => {
        const formattedTime = `${hour}:${minute} ${period}`;
        onSelect(formattedTime);
        onClose();
    };

    const alignColumn = useCallback(
        (
            ref: React.RefObject<ScrollView | null>,
            items: (string | number)[],
            index: number,
        ) => {
            const y = scrollYForIndex(index);
            ref.current?.scrollTo({ y, animated: true });
        },
        [],
    );

    const handleScrollSettled = useCallback(
        (
            event: NativeSyntheticEvent<NativeScrollEvent>,
            items: (string | number)[],
            setter: (val: string | number) => void,
            ref: React.RefObject<ScrollView | null>,
        ) => {
            const y = event.nativeEvent.contentOffset.y;
            const index = indexFromOffset(y, items.length);
            setter(items[index]);
            alignColumn(ref, items, index);
        },
        [alignColumn],
    );

    /** Drag release without much velocity: snap now. Flicks rely on onMomentumScrollEnd. */
    const handleScrollEndDrag = useCallback(
        (
            event: NativeSyntheticEvent<NativeScrollEvent>,
            items: (string | number)[],
            setter: (val: string | number) => void,
            ref: React.RefObject<ScrollView | null>,
        ) => {
            const vy = event.nativeEvent.velocity?.y;
            if (vy != null && Math.abs(vy) > 0.2) return;
            handleScrollSettled(event, items, setter, ref);
        },
        [handleScrollSettled],
    );

    const jumpToIndex = useCallback(
        (
            index: number,
            items: (string | number)[],
            setter: (val: string | number) => void,
            ref: React.RefObject<ScrollView | null>,
        ) => {
            const clamped = Math.max(0, Math.min(index, items.length - 1));
            setter(items[clamped]);
            alignColumn(ref, items, clamped);
        },
        [alignColumn],
    );

    const renderColumn = (
        items: (string | number)[],
        selected: string | number,
        ref: React.RefObject<ScrollView | null>,
        setter: (val: string | number) => void,
    ) => (
        <ScrollView
            ref={ref}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="start"
            decelerationRate="normal"
            bounces
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => handleScrollSettled(e, items, setter, ref)}
            onScrollEndDrag={(e) => handleScrollEndDrag(e, items, setter, ref)}
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * PADDING_ROWS }}
            className="w-[76px]"
            style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        >
            {items.map((item, index) => {
                const isSelected = item === selected;
                return (
                    <Pressable
                        key={String(item) + index}
                        accessibilityRole="button"
                        accessibilityLabel={`${item}`}
                        onPress={() => jumpToIndex(index, items, setter, ref)}
                        style={{ height: ITEM_HEIGHT }}
                        className="justify-center items-center active:opacity-70"
                    >
                        <Text
                            className={`text-xl ${
                                isSelected ? "text-[#1F2937] font-semibold" : "text-[#9CA3AF]"
                            }`}
                        >
                            {item}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 bg-black/40 justify-end">
                <View className="bg-white rounded-t-2xl pb-10">
                    <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border">
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <X size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text className="text-[17px] font-semibold text-[#1F2937]">Time</Text>
                        <TouchableOpacity onPress={handleDone} className="p-1 min-w-[60px]">
                            <Text className="text-[17px] font-semibold text-[#007AFF] text-right">Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
                        <View
                            className="absolute left-5 right-5 bg-surface-light rounded-md z-0"
                            style={{ top: ITEM_HEIGHT * PADDING_ROWS, height: ITEM_HEIGHT }}
                            pointerEvents="none"
                        />
                        <View className="flex-row justify-center px-8 z-10">
                            {renderColumn(HOURS, hour, hourRef, setHour)}
                            {renderColumn(MINUTES, minute, minuteRef, setMinute)}
                            {renderColumn(PERIODS, period, periodRef, setPeriod)}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
