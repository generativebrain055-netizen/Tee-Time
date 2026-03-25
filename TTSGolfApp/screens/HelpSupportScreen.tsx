/**
 * Help & Support Screen (Figma 1269-* Support & FAQs)
 * Provides FAQs and contact support options
 */
import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Linking,
    StyleSheet,
    TextInput,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Mail, ChevronDown, ChevronUp, HelpCircle } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import { useColors } from "../ui/theme";
import { spacing, fontSize, fontFamily, radii } from "../ui/theme/tokens";
import { supportApi } from "../services/api";

const FAQ_DATA = [
    {
        question: "What is Tee Time Social?",
        answer: "Tee Time Social is a golf app that helps you organize tee times with friends, manage your roster, and coordinate golf outings easily. Connect with fellow golfers, schedule games, and track your golfing activity all in one place."
    },
    {
        question: "Do I need to be a member of a golf club to use the app?",
        answer: "No, you don't need to be a member of a golf club. You can use the app to organize tee times at any course. Whether you're playing at a public course or a private club, Tee Time Social helps you coordinate with your golfing partners."
    },
    {
        question: "How do tee time invites work?",
        answer: "You can create a tee time and invite friends from your roster. They'll receive a notification and can accept or decline the invite. Once accepted, they'll be added to the tee time and can see all the details."
    },
    {
        question: "Can I cancel a tee time I created?",
        answer: "Yes, you can cancel a tee time you created at any time. All invited players will be notified of the cancellation. If you're a participant in someone else's tee time, you can leave the tee time, but only the organizer can cancel it."
    },
    {
        question: "What is Social Rate?",
        answer: "Social Rate is a score that reflects your reliability as a golf partner. It increases when you show up on time and decreases when you no-show or cancel late. A higher Social Rate makes you more attractive to other players."
    },
    {
        question: "Why do some players have numbers next to their name?",
        answer: "The numbers represent their handicap, which helps organize fair and competitive games. Handicaps allow players of different skill levels to compete on equal footing."
    },
    {
        question: "What is the difference between the Roster & On-Deck?",
        answer: "Your Roster is your main list of golf friends that you frequently play with. On-Deck is a temporary list of players available for a specific tee time. You can add players from your Roster to On-Deck when creating a tee time."
    },
    {
        question: "What is the difference between groups and tee time chats?",
        answer: "Groups are permanent collections of players you frequently play with. You can create groups for your regular foursome or golf buddies. Tee time chats are temporary and specific to each tee time - they're created automatically when a tee time is created and include all participants."
    },
    {
        question: "How does the availability tab work?",
        answer: "The availability tab shows when you and your friends are available to play. Update your availability weekly to help coordinate games. This makes it easier for organizers to find players who are free at specific times."
    },
    {
        question: "How do I add friends to my roster?",
        answer: "You can add friends by searching for their username, scanning their QR code, or accepting friend requests. Once added, they'll appear in your Roster and you can easily invite them to tee times."
    },
    {
        question: "What happens if I no-show to a tee time?",
        answer: "If you no-show to a tee time, your Social Rate will be penalized (-10 points). This helps maintain accountability and ensures reliable participation. The organizer can mark you as a no-show during check-in."
    },
    {
        question: "Can I change my profile information?",
        answer: "Yes, you can update your profile information including your name, handicap, location, and preferences at any time from the Settings screen. Your profile photo can also be updated."
    },
];

/** Fallback mailto when API cannot be used — should match team inbox */
const CONTACT_EMAIL = "contact@teetimesocial.app";

export default function HelpSupportScreen({ navigation }: any) {
    const colors = useColors();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [emailSending, setEmailSending] = useState(false);

    const openContactModal = () => {
        setEmailSubject("");
        setEmailBody("");
        setShowEmailModal(true);
    };

    const toggleFAQ = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const sendEmailToSupport = async () => {
        const subject = (emailSubject || "Support Request").trim();
        const body = emailBody.trim();
        if (!body) {
            Alert.alert("Error", "Please enter your message.");
            return;
        }
        setEmailSending(true);
        try {
            try {
                await supportApi.sendSupportEmail({
                    subject: subject || undefined,
                    message: body,
                    category: "support",
                });
                setShowEmailModal(false);
                setEmailSubject("");
                setEmailBody("");
                Alert.alert("Thank you", "Your message has been sent to our team.");
                return;
            } catch (apiError: any) {
                if (apiError?.statusCode === 401 || apiError?.code === "NETWORK_ERROR") {
                    throw apiError;
                }
            }
            const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            const canOpen = await Linking.canOpenURL(mailtoUrl);
            if (!canOpen) {
                Alert.alert("Error", "Unable to send. Please email us at " + CONTACT_EMAIL);
                return;
            }
            await Linking.openURL(mailtoUrl);
            setShowEmailModal(false);
            setEmailSubject("");
            setEmailBody("");
            Alert.alert("Success", "Your email app will open. Send the email to contact us.");
        } catch (error: any) {
            if (error?.statusCode === 401) {
                Alert.alert("Error", "Please sign in again and try sending.");
            } else if (error?.code === "NETWORK_ERROR" || !error?.statusCode) {
                const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                try {
                    await Linking.openURL(mailtoUrl);
                    setShowEmailModal(false);
                    setEmailSubject("");
                    setEmailBody("");
                    Alert.alert("Success", "Your email app will open. Send the email to contact us.");
                } catch {
                    Alert.alert("Error", "Unable to send. Please check your connection or email us at " + CONTACT_EMAIL);
                }
            } else {
                Alert.alert("Error", "Failed to send. Please try again or email us at " + CONTACT_EMAIL);
            }
        } finally {
            setEmailSending(false);
        }
    };

    return (
        <ScreenShell>
            <AppHeader
                title="Help & Support"
                onBack={() => navigation?.goBack()}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* Header Section */}
                <View style={[styles.headerSection, { backgroundColor: colors.surface }]}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryContainer }]}>
                        <HelpCircle size={32} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                        We're Here to Help
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Find answers to common questions or contact our support team
                    </Text>
                </View>

                {/* Contact Us Section */}
                <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Contact Us
                    </Text>

                    <View style={[styles.contactRow, { backgroundColor: colors.surfaceSecondary }]}>
                        <View style={styles.contactContent}>
                            <View style={[styles.contactIcon, { backgroundColor: colors.primaryContainer }]}>
                                <Mail size={24} color={colors.primary} strokeWidth={2} />
                            </View>
                            <View style={styles.contactTextCol}>
                                <Text style={[styles.contactLabel, { color: colors.textPrimary }]}>
                                    Email us
                                </Text>
                                <Text style={[styles.contactEmailHint, { color: colors.textSecondary }]}>
                                    {CONTACT_EMAIL}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={openContactModal}
                            style={[styles.emailButton, { backgroundColor: colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.emailButtonText, { color: colors.surface }]}>
                                Send Email
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FAQ Section */}
                <View style={[styles.faqCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        Frequently Asked Questions
                    </Text>

                    {FAQ_DATA.map((faq, index) => (
                        <View key={index}>
                            <TouchableOpacity
                                onPress={() => toggleFAQ(index)}
                                style={[
                                    styles.faqQuestion,
                                    (index < FAQ_DATA.length - 1 || expandedIndex === index) && { 
                                        borderBottomColor: colors.border, 
                                        borderBottomWidth: 1 
                                    },
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.faqQuestionText, { color: colors.textPrimary }]}>
                                    {faq.question}
                                </Text>
                                {expandedIndex === index ? (
                                    <ChevronUp size={20} color={colors.textMuted} strokeWidth={2} />
                                ) : (
                                    <ChevronDown size={20} color={colors.textMuted} strokeWidth={2} />
                                )}
                            </TouchableOpacity>
                            {expandedIndex === index && (
                                <View style={[
                                    styles.faqAnswer,
                                    index < FAQ_DATA.length - 1 && { 
                                        borderBottomColor: colors.border, 
                                        borderBottomWidth: 1 
                                    },
                                ]}>
                                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                                        {faq.answer}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Email compose modal */}
                <Modal
                    visible={showEmailModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setShowEmailModal(false);
                        setEmailSubject(""); setEmailBody("");
                    }}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => {
                            setShowEmailModal(false);
                            setEmailSubject(""); setEmailBody("");
                        }}
                    >
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContainer}
                        >
                            <TouchableOpacity
                                activeOpacity={1}
                                onPress={(e) => e.stopPropagation()}
                            >
                                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                    Contact us
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setShowEmailModal(false);
                                        setEmailSubject(""); setEmailBody("");
                                    }}
                                    style={styles.closeButton}
                                >
                                    <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
                                        ✕
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                                Your message will be sent to our team. Subject is optional.
                            </Text>

                            <TextInput
                                style={[styles.subjectInput, {
                                    backgroundColor: colors.surfaceSecondary,
                                    color: colors.textPrimary,
                                    borderColor: colors.border,
                                }]}
                                value={emailSubject}
                                onChangeText={setEmailSubject}
                                placeholder="Subject (optional)"
                                placeholderTextColor={colors.textMuted}
                            />

                            <TextInput
                                style={[styles.feedbackInput, { 
                                    backgroundColor: colors.surfaceSecondary,
                                    color: colors.textPrimary,
                                    borderColor: colors.border,
                                }]}
                                value={emailBody}
                                onChangeText={setEmailBody}
                                placeholder="Enter your message..."
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                            />

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { borderColor: colors.border }]}
                                    onPress={() => {
                                        setShowEmailModal(false);
                                        setEmailSubject(""); setEmailBody("");
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                                    onPress={sendEmailToSupport}
                                    disabled={emailSending || !emailBody.trim()}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.submitButtonText, { color: colors.surface }]}>
                                        {emailSending ? 'Sending...' : 'Send'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                                </View>
                            </TouchableOpacity>
                        </KeyboardAvoidingView>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    contentContainer: {
        padding: spacing.lg,
        paddingBottom: spacing['4xl'],
    },
    headerSection: {
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize['2xl'],
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        textAlign: 'center',
    },
    contactCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.lg,
        marginBottom: spacing.md,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radii.md,
        padding: spacing.md,
    },
    contactContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        paddingRight: spacing.sm,
    },
    contactIcon: {
        width: 48,
        height: 48,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    contactTextCol: {
        flex: 1,
        minWidth: 0,
    },
    contactLabel: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    contactEmailHint: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.xs,
        marginTop: spacing['2xs'],
    },
    emailButton: {
        borderRadius: radii.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        flexShrink: 0,
    },
    emailButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.sm,
    },
    faqCard: {
        borderRadius: radii.lg,
        padding: spacing.lg,
    },
    faqQuestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    faqQuestionText: {
        fontFamily: fontFamily.medium,
        fontSize: fontSize.base,
        flex: 1,
        paddingRight: spacing.md,
    },
    faqAnswer: {
        paddingVertical: spacing.md,
        paddingBottom: spacing.lg,
    },
    faqAnswerText: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        lineHeight: fontSize.base * 1.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 500,
    },
    modalContent: {
        width: '100%',
        borderRadius: radii.lg,
        padding: spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
    },
    closeButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        fontFamily: fontFamily.bold,
        fontSize: fontSize.xl,
    },
    modalDescription: {
        fontFamily: fontFamily.regular,
        fontSize: fontSize.sm,
        marginBottom: spacing.md,
        lineHeight: fontSize.base * 1.4,
    },
    subjectInput: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        marginBottom: spacing.md,
    },
    feedbackInput: {
        borderWidth: 1,
        borderRadius: radii.md,
        padding: spacing.md,
        minHeight: 120,
        fontFamily: fontFamily.regular,
        fontSize: fontSize.base,
        marginBottom: spacing.lg,
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
    submitButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: radii.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontFamily: fontFamily.semiBold,
        fontSize: fontSize.base,
    },
});
