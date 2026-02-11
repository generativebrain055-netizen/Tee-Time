import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
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
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
            className="w-[70px]"
            style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        >
            {items.map((item, index) => {
                const isSelected = item === selected;
                return (
                    <View key={index} className="justify-center items-center" style={{ height: ITEM_HEIGHT }}>
                        <Text className={`text-xl ${
                            isSelected ? "text-[#1F2937] font-semibold" : "text-[#9CA3AF]"
                        }`}>
                            {item}
                        </Text>
                    </View>
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
                            style={{ top: ITEM_HEIGHT * 2, height: ITEM_HEIGHT }}
                        />
                        <View className="flex-row justify-center px-10 z-10">
                            {renderColumn(
                                HOURS,
                                hour,
                                hourRef as any,
                                (e) => handleScroll(e, HOURS, setHour)
                            )}
                            {renderColumn(
                                MINUTES,
                                minute,
                                minuteRef as any,
                                (e) => handleScroll(e, MINUTES, setMinute)
                            )}
                            {renderColumn(
                                PERIODS,
                                period,
                                periodRef as any,
                                (e) => handleScroll(e, PERIODS, setPeriod)
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
