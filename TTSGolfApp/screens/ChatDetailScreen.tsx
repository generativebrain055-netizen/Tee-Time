import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
    ArrowLeft,
    MoreVertical,
    Image as ImageIcon,
    Smile,
    Send,
    X,
    Users,
} from "lucide-react-native";

// --- TYPES ---
interface ChatMessage {
    id: number;
    senderId: number;
    senderName: string;
    senderImg: string;
    message: string;
    time: string;
    isMe: boolean;
}

interface ChatInfo {
    id: number;
    name: string;
    subtitle: string;
    img: string;
    isGroup?: boolean;
}

// --- CONSTANTS ---
const COLORS = {
    primary: "#5DB075",
    primaryLight: "#D1FAE5",
    secondary: "#F6F6F6",
    textMain: "#1F2937",
    textSub: "#6B7280",
    divider: "#E5E7EB",
    white: "#FFFFFF",
    bg: "#F6F6F6",
    myMessageBg: "#D1FAE5",
    otherMessageBg: "#FFFFFF",
};

// --- MOCK DATA ---
const CHAT_INFO: ChatInfo = {
    id: 1,
    name: "Nov 18 @7:40 - Torrey Pines...",
    subtitle: "4 players",
    img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Group1",
    isGroup: true,
};

const CHAT_MESSAGES: ChatMessage[] = [
    {
        id: 1,
        senderId: 2,
        senderName: "Mike Smith",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        message: "Hey! Are you free for a round this weekend?",
        time: "10:30 AM",
        isMe: false,
    },
    {
        id: 2,
        senderId: 1,
        senderName: "You",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        message: "Yeah! What time were you thinking?",
        time: "10:32 AM",
        isMe: true,
    },
    {
        id: 3,
        senderId: 2,
        senderName: "Mike Smith",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        message: "How about Saturday morning around 9:00 AM?",
        time: "10:30 AM",
        isMe: false,
    },
    {
        id: 4,
        senderId: 1,
        senderName: "You",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        message: "Perfect. Which course?",
        time: "10:32 AM",
        isMe: true,
    },
    {
        id: 5,
        senderId: 3,
        senderName: "David Wilson",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        message: "Pine Valley. I can go ahead and book the tee time.",
        time: "10:30 AM",
        isMe: false,
    },
    {
        id: 6,
        senderId: 1,
        senderName: "You",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        message: "Awesome. See you there! 🏌️",
        time: "10:32 AM",
        isMe: true,
    },
    {
        id: 7,
        senderId: 4,
        senderName: "Sarah Johnson",
        senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        message: "Looking forward to it!",
        time: "10:30 AM",
        isMe: false,
    },
];

export default function ChatDetailScreen({ navigation, route }: any) {
    const [messageText, setMessageText] = useState("");
    const [showMenu, setShowMenu] = useState(false);
    const chatInfo = route?.params?.chatInfo || CHAT_INFO;
    const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);

    const handleSend = () => {
        if (messageText.trim()) {
            const newMessage: ChatMessage = {
                id: messages.length + 1,
                senderId: 1,
                senderName: "You",
                senderImg: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
                message: messageText.trim(),
                time: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
                isMe: true,
            };
            setMessages((prev) => [...prev, newMessage]);
            setMessageText("");
        }
    };

    // --- HEADER ---
    const Header = () => (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation && (navigation as any).goBack()}
                >
                    <ArrowLeft size={24} color={COLORS.textMain} />
                </TouchableOpacity>
                <View style={styles.chatAvatarContainer}>
                    {chatInfo.isGroup ? (
                        <View style={styles.groupAvatar}>
                            <Users size={20} color={COLORS.white} />
                        </View>
                    ) : (
                        <Image source={{ uri: chatInfo.img }} style={styles.chatAvatar} />
                    )}
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {chatInfo.name}
                    </Text>
                    <Text style={styles.headerSubtitle}>{chatInfo.subtitle}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowMenu(true)}
            >
                <MoreVertical size={24} color={COLORS.textMain} />
            </TouchableOpacity>
        </View>
    );

    // --- MESSAGE BUBBLE ---
    const MessageBubble = ({ message }: { message: ChatMessage }) => (
        <View
            style={[
                styles.messageContainer,
                message.isMe ? styles.myMessageContainer : styles.otherMessageContainer,
            ]}
        >
            {!message.isMe && (
                <Image source={{ uri: message.senderImg }} style={styles.messageAvatar} />
            )}
            <View
                style={[
                    styles.messageBubble,
                    message.isMe ? styles.myMessageBubble : styles.otherMessageBubble,
                ]}
            >
                <Text
                    style={[
                        styles.messageText,
                        message.isMe ? styles.myMessageText : styles.otherMessageText,
                    ]}
                >
                    {message.message}
                </Text>
                <Text
                    style={[
                        styles.messageTime,
                        message.isMe ? styles.myMessageTime : styles.otherMessageTime,
                    ]}
                >
                    {message.time}
                </Text>
            </View>
            {message.isMe && <View style={styles.messageSpacer} />}
        </View>
    );

    // --- CHAT ACTIONS MENU ---
    const ChatActionsMenu = () => (
        <Modal
            visible={showMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowMenu(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowMenu(false)}
            >
                <View style={styles.menuContainer}>
                    <View style={styles.menuHeader}>
                        <Text style={styles.menuTitle}>Chat actions</Text>
                        <TouchableOpacity onPress={() => setShowMenu(false)}>
                            <X size={24} color={COLORS.textMain} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Create group</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Mute</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                            Delete chat
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // --- INPUT BAR (using useCallback to prevent re-renders) ---
    const handleTextChange = useCallback((text: string) => {
        setMessageText(text);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <Header />
                <ScrollView
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                >
                    {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                    ))}
                </ScrollView>
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.inputButton}>
                        <ImageIcon size={24} color={COLORS.textSub} />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor={COLORS.textSub}
                        value={messageText}
                        onChangeText={handleTextChange}
                        multiline
                    />
                    <TouchableOpacity style={styles.inputButton}>
                        <Smile size={24} color={COLORS.textSub} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            messageText.trim() && styles.sendButtonActive,
                        ]}
                        onPress={handleSend}
                        disabled={!messageText.trim()}
                    >
                        <Send
                            size={20}
                            color={messageText.trim() ? COLORS.white : COLORS.textSub}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            <ChatActionsMenu />
        </SafeAreaView>
    );
}


// --- STYLES ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    keyboardView: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 12,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -8,
    },
    chatAvatarContainer: {
        marginLeft: 8,
    },
    chatAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.divider,
    },
    groupAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.textSub,
        justifyContent: "center",
        alignItems: "center",
    },
    headerInfo: {
        marginLeft: 12,
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    headerSubtitle: {
        fontSize: 13,
        color: COLORS.textSub,
        marginTop: 2,
    },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    messagesContent: {
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    messageContainer: {
        flexDirection: "row",
        marginBottom: 16,
        alignItems: "flex-end",
    },
    myMessageContainer: {
        justifyContent: "flex-end",
    },
    otherMessageContainer: {
        justifyContent: "flex-start",
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.divider,
        marginRight: 8,
    },
    messageSpacer: {
        width: 40,
    },
    messageBubble: {
        maxWidth: "70%",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    myMessageBubble: {
        backgroundColor: COLORS.myMessageBg,
        borderBottomRightRadius: 4,
    },
    otherMessageBubble: {
        backgroundColor: COLORS.otherMessageBg,
        borderBottomLeftRadius: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: COLORS.textMain,
    },
    otherMessageText: {
        color: COLORS.textMain,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    myMessageTime: {
        color: COLORS.textSub,
        textAlign: "right",
    },
    otherMessageTime: {
        color: COLORS.textSub,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        paddingBottom: 28,
    },
    inputButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.secondary,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: COLORS.textMain,
        maxHeight: 100,
        minHeight: 40,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.secondary,
        marginLeft: 8,
    },
    sendButtonActive: {
        backgroundColor: COLORS.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    menuHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.textMain,
    },
    menuItem: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    menuItemText: {
        fontSize: 16,
        color: COLORS.textMain,
    },
    menuItemDanger: {
        color: "#EF4444",
    },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.divider,
        marginHorizontal: 20,
    },
});
