import React, { useState, useEffect, useCallback, memo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Alert,
} from "react-native";
import { Plus, MessageCircle, Search, X } from "lucide-react-native";
import { useColors, useTheme } from "../../ui/theme";
import { rosterApi } from "../../services/api";
import { logger } from "../../utils/logger";
import { useDebounce } from "../../hooks";

interface OnDeckListProps {
    navigation: any;
}

const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

const formatLastPlayed = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays === 2) return "2 days ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return "1 week ago";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 60) return "last month";
    
    return date.toLocaleDateString();
};

const OnDeckItem = memo(({ item, navigation, colors, theme, onAddToRoster }: { 
    item: any; 
    navigation: any; 
    colors: any; 
    theme: any;
    onAddToRoster?: (item: any) => void;
}) => {
    const handlePress = () => {
        const userId = item.contact?.userId || item.id;
        navigation?.navigate("FriendProfile", { userId });
    };
    
    const handleAddToRoster = (e: any) => {
        e.stopPropagation();
        onAddToRoster?.(item);
    };
    
    // Extract contact data (handle both roster API format and flat format)
    const contact = item.contact || item;
    const firstName = contact.name?.split(" ")[0] || contact.firstName || "";
    const lastName = contact.name?.split(" ").slice(1).join(" ") || contact.lastName || "";
    const avatar = contact.avatar || item.avatar;
    const lastPlayed = item.stats?.lastPlayedTogether || item.lastPlayed;

    return (
        <TouchableOpacity 
            onPress={handlePress}
            activeOpacity={0.7}
            style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: 20,
                backgroundColor: "#FFFFFF",
            }}
        >
            {avatar ? (
                <Image 
                    source={{ uri: avatar }} 
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                    }}
                />
            ) : (
                <View style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#E5E7EB",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#6B7280" }}>
                        {getInitials(firstName, lastName)}
                    </Text>
                </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontFamily: theme.fontFamily.semiBold, fontSize: 16, color: "#111827" }}>
                    {contact.name || `${firstName} ${lastName}`.trim()}
                </Text>
                <Text style={{ fontFamily: theme.fontFamily.regular, fontSize: 13, color: "#9CA3AF", marginTop: 3 }}>
                    Last played: {lastPlayed ? formatLastPlayed(lastPlayed) : "never"}
                </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity 
                    onPress={(e) => {
                        e.stopPropagation();
                        // Handle add to roster action
                    }}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#D1D5DB",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                >
                    <Plus size={20} color="#111827" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={(e) => {
                        e.stopPropagation();
                        // Handle message action
                    }}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: "#DBEAFE",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                >
                    <MessageCircle size={18} color="#3B82F6" strokeWidth={2} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
});

OnDeckItem.displayName = "OnDeckItem";

export default function OnDeckList({ navigation }: OnDeckListProps) {
    const colors = useColors();
    const theme = useTheme();
    const [onDeck, setOnDeck] = useState<any[]>([]);
    const [filteredOnDeck, setFilteredOnDeck] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [addingId, setAddingId] = useState<string | null>(null);
    
    const debouncedSearch = useDebounce(searchText, 300);

    const loadOnDeck = useCallback(async () => {
        try {
            const response = await rosterApi.getOnDeck();
            if (response.success) {
                const data = response.onDeck || [];
                setOnDeck(data);
                setFilteredOnDeck(data);
            }
        } catch (error) {
            logger.error("[OnDeckList] Failed to load on-deck", error);
            setOnDeck([]);
            setFilteredOnDeck([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);
    
    // Filter on-deck list based on search
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.trim() === "") {
            setFilteredOnDeck(onDeck);
            return;
        }
        
        const searchLower = debouncedSearch.toLowerCase();
        const filtered = onDeck.filter((item) => {
            const contact = item.contact || item;
            const name = contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
            const username = contact.username || "";
            
            return (
                name.toLowerCase().includes(searchLower) ||
                username.toLowerCase().includes(searchLower) ||
                contact.phone?.includes(searchLower)
            );
        });
        
        setFilteredOnDeck(filtered);
    }, [debouncedSearch, onDeck]);
    
    const handleAddToRoster = useCallback(async (item: any) => {
        const contact = item.contact || item;
        const name = contact.name || `${contact.firstName || ""} ${contact.lastName || ""}`.trim();
        
        setAddingId(item.id);
        try {
            const payload: any = {};
            
            if (contact.userId) {
                payload.contactUserId = contact.userId;
            } else if (contact.phone) {
                payload.contactPhone = contact.phone;
            }
            
            if (contact.name) {
                payload.contactName = contact.name;
            }
            
            if (contact.email) {
                payload.contactEmail = contact.email;
            }
            
            const response = await rosterApi.addToRoster(payload);
            
            if (response.success) {
                logger.info("[OnDeckList] Added to roster", { rosterId: response.entry?.id });
                Alert.alert("Success", `${name} has been added to your roster`);
                // Reload on-deck list (they'll be removed from on-deck when added to roster)
                await loadOnDeck();
            }
        } catch (error: any) {
            logger.error("[OnDeckList] Failed to add to roster", error);
            const errorMessage = error.message || "Failed to add to roster. Please try again.";
            Alert.alert("Error", errorMessage);
        } finally {
            setAddingId(null);
        }
    }, [loadOnDeck]);

    useEffect(() => {
        loadOnDeck();
    }, [loadOnDeck]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOnDeck();
    }, [loadOnDeck]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (onDeck.length === 0 && !loading) {
        return (
            <ScrollView 
                style={{ flex: 1, backgroundColor: "#FFFFFF" }}
                contentContainerStyle={{ flex: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.bold, 
                        fontSize: 20, 
                        color: "#111827",
                        marginBottom: 12,
                        textAlign: "center",
                    }}>
                        Backup players
                    </Text>
                    <Text style={{ 
                        fontFamily: theme.fontFamily.regular, 
                        fontSize: 15, 
                        color: "#6B7280",
                        textAlign: "center",
                        lineHeight: 22,
                        marginBottom: 24,
                    }}>
                        Golfing buddies who are not part of your core Roster; out-of-town friends, occasional players, or last-minute fills. Promote them to your Roster at anytime or invite them directly via Manual Invite.
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 10,
                        }}
                        onPress={() => navigation?.navigate('FindPlayers')}
                    >
                        <Text style={{ 
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 15, 
                            color: "#FFFFFF",
                        }}>
                            Find players
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            {/* Search Bar */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                <View style={{ position: "relative" }}>
                    <View style={{ position: "absolute", left: 12, top: "50%", transform: [{ translateY: -10 }], zIndex: 1 }}>
                        <Search size={18} color="#9CA3AF" strokeWidth={2} />
                    </View>
                    <TextInput
                        placeholder="Search on-deck players"
                        value={searchText}
                        onChangeText={setSearchText}
                        style={{
                            width: "100%",
                            backgroundColor: "#F9FAFB",
                            borderWidth: 1,
                            borderColor: "#E5E7EB",
                            borderRadius: 12,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            paddingLeft: 40,
                            paddingRight: searchText.length > 0 ? 40 : 16,
                            fontSize: 15,
                            fontFamily: theme.fontFamily.regular,
                            color: "#111827",
                        }}
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchText("")}
                            style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: [{ translateY: -10 }],
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: "#D1D5DB",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <X size={14} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {filteredOnDeck.length === 0 && !loading ? (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, paddingTop: 60 }}>
                        <Search size={56} color="#D1D5DB" strokeWidth={1.5} />
                        <Text style={{
                            fontFamily: theme.fontFamily.semiBold,
                            fontSize: 17,
                            color: "#6B7280",
                            marginTop: 20,
                            textAlign: "center",
                        }}>
                            {searchText ? "No players found" : "No backup players"}
                        </Text>
                        <Text style={{
                            fontFamily: theme.fontFamily.regular,
                            fontSize: 14,
                            color: "#9CA3AF",
                            marginTop: 8,
                            textAlign: "center",
                        }}>
                            {searchText ? "Try a different search" : "Add players to your on-deck list"}
                        </Text>
                    </View>
                ) : (
                    <>
                        {filteredOnDeck.map((item, index) => (
                            <React.Fragment key={item.id || index}>
                                <OnDeckItem 
                                    item={item} 
                                    navigation={navigation} 
                                    colors={colors} 
                                    theme={theme}
                                    onAddToRoster={handleAddToRoster}
                                />
                                {index < filteredOnDeck.length - 1 && (
                                    <View style={{ height: 1, backgroundColor: "#F3F4F6", marginLeft: 76 }} />
                                )}
                            </React.Fragment>
                        ))}
                        <View style={{ height: 100 }} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}
