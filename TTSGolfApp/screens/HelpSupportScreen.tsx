import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Linking,
} from "react-native";
import { Mail, ChevronDown, ChevronUp } from "lucide-react-native";
import { ScreenShell, ContentArea, AppHeader } from "../ui";

const FAQ_DATA = [
    {
        question: "What is tee time social?",
        answer: "Tee Time Social is a golf app that helps you organize tee times with friends, manage your roster, and coordinate golf outings easily."
    },
    {
        question: "Do I need to be a member of a golf club to use the app?",
        answer: "No, you don't need to be a member of a golf club. You can use the app to organize tee times at any course."
    },
    {
        question: "How do tee time invites work?",
        answer: "You can create a tee time and invite friends from your roster. They'll receive a notification and can accept or decline the invite."
    },
    {
        question: "Can I cancel a tee time I created?",
        answer: "Yes, you can cancel a tee time you created at any time. All invited players will be notified of the cancellation."
    },
    {
        question: "Why do some players have numbers next to their name?",
        answer: "The numbers represent their handicap, which helps organize fair and competitive games."
    },
    {
        question: "What is the difference between the Roster & On-Deck?",
        answer: "Your Roster is your main list of golf friends. On-Deck is a temporary list of players available for a specific tee time."
    },
    {
        question: "What is the difference between groups and tee time chats?",
        answer: "Groups are permanent collections of players you frequently play with. Tee time chats are temporary and specific to each tee time."
    },
    {
        question: "How does the availability tab work?",
        answer: "The availability tab shows when you and your friends are available to play. Update your availability weekly to help coordinate games."
    },
];

export default function HelpSupportScreen({ navigation }: any) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const handleSendEmail = () => {
        Linking.openURL("mailto:support@teetimesocial.com");
    };

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <ScreenShell>
            <AppHeader
                title="Help & Support"
                onBack={() => navigation?.goBack()}
            />

            <ContentArea
                style={{ backgroundColor: '#F3F4F6' }}
                contentContainerStyle={{ padding: 16 }}
            >
                {/* Contact Us Section */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    <Text style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 18,
                        color: '#111827',
                        marginBottom: 16,
                    }}>
                        Contact Us
                    </Text>

                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F9FAFB',
                        borderRadius: 12,
                        padding: 16,
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flex: 1,
                        }}>
                            <View style={{
                                width: 48,
                                height: 48,
                                backgroundColor: '#D1FAE5',
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}>
                                <Mail size={24} color="#10B981" strokeWidth={2} />
                            </View>
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 16,
                                color: '#111827',
                            }}>
                                Email Support
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSendEmail}
                            style={{
                                backgroundColor: '#5EBC68',
                                borderRadius: 10,
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                            }}
                        >
                            <Text style={{
                                fontFamily: 'Inter_600SemiBold',
                                fontSize: 14,
                                color: '#FFFFFF',
                            }}>
                                Send Email
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FAQ Section */}
                <View style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    <Text style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: 18,
                        color: '#111827',
                        marginBottom: 16,
                    }}>
                        Frequently Asked Questions
                    </Text>

                    {FAQ_DATA.map((faq, index) => (
                        <View key={index}>
                            <TouchableOpacity
                                onPress={() => toggleFAQ(index)}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: 16,
                                    borderBottomWidth: index < FAQ_DATA.length - 1 || expandedIndex === index ? 1 : 0,
                                    borderBottomColor: '#F3F4F6',
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'Inter_500Medium',
                                    fontSize: 15,
                                    color: '#111827',
                                    flex: 1,
                                    paddingRight: 12,
                                }}>
                                    {faq.question}
                                </Text>
                                {expandedIndex === index ? (
                                    <ChevronUp size={20} color="#6B7280" strokeWidth={2} />
                                ) : (
                                    <ChevronDown size={20} color="#6B7280" strokeWidth={2} />
                                )}
                            </TouchableOpacity>
                            {expandedIndex === index && (
                                <View style={{
                                    paddingVertical: 12,
                                    paddingBottom: 16,
                                    borderBottomWidth: index < FAQ_DATA.length - 1 ? 1 : 0,
                                    borderBottomColor: '#F3F4F6',
                                }}>
                                    <Text style={{
                                        fontFamily: 'Inter_400Regular',
                                        fontSize: 14,
                                        color: '#6B7280',
                                        lineHeight: 20,
                                    }}>
                                        {faq.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ContentArea>
        </ScreenShell>
    );
}
