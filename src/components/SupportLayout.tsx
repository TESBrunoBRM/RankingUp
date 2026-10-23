import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useThemePalette, useThemedStyles, type ThemePalette } from "../theme";

export function SupportLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const navigation = useNavigation();
  const theme = useThemePalette();
  const styles = useThemedStyles(supportStyles);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.iconButton} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const supportStyles = (theme: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      height: 58,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { color: theme.text, fontSize: 14, fontWeight: "900" },
    content: { padding: 22, paddingBottom: 60 },
    eyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: theme.accent,
      marginBottom: 13,
    },
    title: {
      fontSize: 27,
      fontWeight: "900",
      color: theme.text,
      marginBottom: 12,
    },
    description: {
      fontSize: 13,
      lineHeight: 21,
      color: theme.muted,
      marginBottom: 24,
    },
    label: {
      color: theme.text,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
      marginTop: 17,
    },
    input: {
      minHeight: 48,
      color: theme.text,
      fontSize: 14,
      padding: 13,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    multiline: { minHeight: 110, textAlignVertical: "top" },
    reason: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 15,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      marginBottom: 9,
      backgroundColor: theme.surface,
    },
    reasonActive: { borderColor: theme.accent },
    reasonText: { color: theme.text, fontSize: 13, fontWeight: "700" },
    helper: { fontSize: 11, lineHeight: 18, color: theme.muted, marginTop: 10 },
    error: {
      backgroundColor: theme.warningSurface,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      borderRadius: 8,
      marginVertical: 15,
    },
    errorText: { color: theme.warningText, fontSize: 12, lineHeight: 19 },
    attachment: {
      minHeight: 65,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 15,
      marginTop: 15,
    },
    attachmentText: { color: theme.accent, fontSize: 12, fontWeight: "800" },
    photo: {
      width: "100%",
      height: 200,
      resizeMode: "contain",
      marginTop: 15,
      borderRadius: 8,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    tabs: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      paddingVertical: 14,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 7,
      alignItems: "center",
      backgroundColor: theme.surface,
    },
    tabActive: { backgroundColor: theme.accentFill },
    tabText: { fontSize: 11, fontWeight: "800", color: theme.muted },
    tabTextActive: { color: "#121212" },
    card: {
      padding: 18,
      backgroundColor: theme.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
      flex: 1,
      marginRight: 10,
    },
    status: {
      color: theme.accent,
      fontSize: 10,
      fontWeight: "800",
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 5,
    },
    cardDate: { color: theme.muted, fontSize: 10, marginTop: 10 },
    cardBody: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 20,
      marginTop: 12,
    },
    response: {
      backgroundColor: theme.surfaceAlt,
      padding: 13,
      borderRadius: 7,
      marginTop: 14,
    },
    responseLabel: {
      color: theme.accent,
      fontSize: 10,
      fontWeight: "800",
      marginBottom: 5,
    },
    responseText: { color: theme.text, fontSize: 12, lineHeight: 20 },
    empty: { padding: 35, alignItems: "center", gap: 15 },
    emptyText: {
      fontSize: 13,
      lineHeight: 21,
      color: theme.muted,
      textAlign: "center",
    },
  });
