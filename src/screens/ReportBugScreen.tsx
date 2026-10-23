import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Button } from "../components/Button";
import { SupportLayout, supportStyles } from "../components/SupportLayout";
import { useThemePalette, useThemedStyles } from "../theme";
import { rankingUpApiClient } from "../services/rankingUpApiClient";
import { foodImageService, type FoodPhoto } from "../services/foodImageService";
import { uploadBugScreenshot } from "../services/reportImageService";
import { getErrorMessage } from "../utils/errors";
import type { AppStackParamList } from "../types";

export default function ReportBugScreen() {
  const theme = useThemePalette();
  const styles = useThemedStyles(supportStyles);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [photo, setPhoto] = useState<FoodPhoto | null>(null);
  const [path, setPath] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectPhoto = async () => {
    try {
      const selected = await foodImageService.selectPhoto("gallery");
      if (selected) {
        setPhoto(selected);
        setPath(undefined);
      }
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo seleccionar la captura."));
    }
  };
  const submit = async () => {
    if (busy) return;
    if (
      title.trim().length < 3 ||
      description.trim().length < 10 ||
      steps.trim().length < 3
    ) {
      setError(
        "Escribe un título, una descripción de al menos 10 caracteres y los pasos para reproducir el problema.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      let uploaded = path;
      if (photo && !uploaded) {
        uploaded = await uploadBugScreenshot(photo);
        setPath(uploaded);
      }
      await rankingUpApiClient.reportBug({
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim(),
        appVersion: Constants.expoConfig?.version ?? "desconocida",
        platform: `${Platform.OS} ${Platform.Version}`,
        screenshotPath: uploaded,
      });
      Alert.alert(
        "Problema recibido",
        "Gracias por ayudarnos a mejorar. Puedes seguir el estado en Mis envíos.",
        [
          {
            text: "Ver mis envíos",
            onPress: () =>
              navigation.replace("MySubmissions", { kind: "bugs" }),
          },
          { text: "Listo", onPress: () => navigation.goBack() },
        ],
      );
    } catch (cause) {
      setError(getErrorMessage(cause, "No se pudo enviar el reporte."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SupportLayout title="REPORTAR UN PROBLEMA">
      <Text style={styles.eyebrow}>AYÚDANOS A MEJORAR</Text>
      <Text style={styles.title}>¿Algo no salió bien?</Text>
      <Text style={styles.description}>
        Describe lo que pasó y los pasos para que podamos revisarlo.
      </Text>
      <Text style={styles.label}>Título</Text>
      <TextInput
        accessibilityLabel="Título del problema"
        editable={!busy}
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Ej. No puedo guardar un alimento"
        placeholderTextColor={theme.muted}
      />
      <Text style={styles.label}>¿Qué pasó y qué esperabas?</Text>
      <TextInput
        accessibilityLabel="Descripción del problema"
        editable={!busy}
        style={[styles.input, styles.multiline]}
        multiline
        value={description}
        onChangeText={setDescription}
        maxLength={4000}
        placeholder="Cuéntanos los detalles…"
        placeholderTextColor={theme.muted}
      />
      <Text style={styles.label}>Pasos para reproducirlo</Text>
      <TextInput
        accessibilityLabel="Pasos para reproducir"
        editable={!busy}
        style={[styles.input, styles.multiline]}
        multiline
        value={steps}
        onChangeText={setSteps}
        maxLength={4000}
        placeholder="1. Abrí la sección… 2. Toqué… 3. Ocurrió…"
        placeholderTextColor={theme.muted}
      />
      {photo ? (
        <>
          <Image
            accessibilityLabel="Captura adjunta"
            source={{ uri: photo.uri }}
            style={styles.photo}
          />
          <Pressable
            disabled={busy}
            accessibilityLabel="Quitar captura"
            style={styles.attachment}
            onPress={() => {
              setPhoto(null);
              setPath(undefined);
            }}
          >
            <Text style={styles.attachmentText}>Quitar captura</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          disabled={busy}
          accessibilityLabel="Adjuntar captura opcional"
          style={styles.attachment}
          onPress={() => void selectPhoto()}
        >
          <Ionicons name="image-outline" size={23} color={theme.accent} />
          <Text style={styles.attachmentText}>Adjuntar captura (opcional)</Text>
        </Pressable>
      )}
      <Text style={styles.helper}>
        Máximo 5 MB. Adjunta solo información que quieras compartir con soporte.
        Incluiremos la versión de la app y el sistema operativo.
      </Text>
      {error ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Button
        title="Enviar problema"
        disabled={busy}
        loading={busy}
        onPress={() => void submit()}
      />
    </SupportLayout>
  );
}
