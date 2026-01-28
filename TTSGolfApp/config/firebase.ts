import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Firestore,
    Timestamp,
} from "firebase/firestore";

// Firebase configuration - get these from Firebase Console
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

// Initialize Firebase only if not already initialized
let app: FirebaseApp;
let db: Firestore;

const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.projectId;
};

if (isFirebaseConfigured()) {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }
    db = getFirestore(app);
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    message: string;
    timestamp: Timestamp | null;
    isMe: boolean;
}

// Get chat room ID (sorted user IDs to ensure consistency)
export const getChatRoomId = (userId1: string, userId2: string): string => {
    return [userId1, userId2].sort().join("_");
};

// Send a message
export const sendMessage = async (
    chatRoomId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string | undefined,
    message: string
): Promise<void> => {
    if (!isFirebaseConfigured() || !db) {
        console.warn("Firebase not configured - messages will not be persisted");
        return;
    }

    const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
    await addDoc(messagesRef, {
        senderId,
        senderName,
        senderAvatar: senderAvatar || null,
        message,
        timestamp: serverTimestamp(),
    });
};

// Subscribe to messages in a chat room
export const subscribeToMessages = (
    chatRoomId: string,
    currentUserId: string,
    callback: (messages: ChatMessage[]) => void
): (() => void) => {
    if (!isFirebaseConfigured() || !db) {
        console.warn("Firebase not configured - using local messages only");
        return () => {};
    }

    const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                senderAvatar: data.senderAvatar,
                message: data.message,
                timestamp: data.timestamp,
                isMe: data.senderId === currentUserId,
            };
        });
        callback(messages);
    });

    return unsubscribe;
};

export { db, isFirebaseConfigured };
