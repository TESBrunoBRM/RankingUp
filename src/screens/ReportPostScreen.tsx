import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../components/Button";
import { SupportLayout, supportStyles } from "../components/SupportLayout";
import { useThemePalette, useThemedStyles } from "../theme";
import type { AppStackParamList, ReportReason } from "../types";
import { rankingUpApiClient } from "../services/rankingUpApiClient";
import { getErrorMessage } from "../utils/errors";

export const reportReasons: Record<ReportReason, string> = {
  spam: "Spam o publicidad",
  harassment: "Acoso o trato ofensivo",
  inappropriate: "Contenido inapropiado",
  violence: "Violencia o amenazas",
  misinformation: "Información engañosa",
  other: "Otro motivo",
};

export default function ReportPostScreen() {
  const { params } = useRoute<RouteProp<AppStackParamList, "ReportPost">>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const theme = useThemePalette();
  const styles = useThemedStyles(supportStyles);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await rankingUpApiClient.reportPost({
        postId: params.postId,
        reason,
        details: details.trim(),
      });
      Alert.alert(
        "Denuncia recibida",
        "El equipo revisará la publicación. Puedes consultar la respuesta en Mis envíos.",
        [
          {
            text: "Ver mis envíos",
            onPress: () =>
              navigation.replace("MySubmissions", { kind: "posts" }),
          },
          { text: "Listo", onPress: () => navigation.goBack() },
        ],
      );
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo enviar la denuncia."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SupportLayout title="REPORTAR PUBLICACIÓN">
      <Text style={styles.eyebrow}>CUIDEMOS LA COMUNIDAD</Text>
      <Text style={styles.title}>Cuéntanos qué sucede.</Text>
      <Text style={styles.description}>
        Revisaremos «{params.postTitle ?? "esta publicación"}». Tu identidad no
        se mostrará al autor.
      </Text>
      {(Object.entries(reportReasons) as [ReportReason, string][]).map(
        ([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === value }}
            disabled={busy}
            onPress={() => setReason(value)}
            style={[styles.reason, reason === value && styles.reasonActive]}
          >
            <Text style={styles.reasonText}>{label}</Text>
            <Ionicons
              name={reason === value ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={reason === value ? theme.accent : theme.muted}
            />
          </Pressable>
        ),
      )}
      <Text style={styles.label}>Más detalles (opcional)</Text>
      <TextInput
        accessibilityLabel="Detalles de la denuncia"
        multiline
        maxLength={2000}
        editable={!busy}
        style={[styles.input, styles.multiline]}
        value={details}
        onChangeText={setDetails}
        placeholder="Añade el contexto que nos ayude a revisar…"
        placeholderTextColor={theme.muted}
      />
      {error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Button
        title="Enviar denuncia"
        loading={busy}
        disabled={busy}
        onPress={() => void submit()}
      />
      <Text style={styles.helper}>
        La publicación será revisada antes de tomar una decisión.
      </Text>
    </SupportLayout>
  );
}
