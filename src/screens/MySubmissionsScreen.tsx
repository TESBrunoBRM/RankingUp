import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supportStyles } from "../components/SupportLayout";
import { useThemePalette, useThemedStyles } from "../theme";
import { rankingUpApiClient } from "../services/rankingUpApiClient";
import { getErrorMessage } from "../utils/errors";
import type {
  AppStackParamList,
  OwnSubmission,
  SubmissionKind,
} from "../types";
import { reportReasons } from "./ReportPostScreen";

const statuses: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  in_review: "En revisión",
  resolved: "Resuelto",
  dismissed: "Desestimado",
  open: "Abierto",
  in_progress: "En progreso",
  closed: "Cerrado",
};
const tabs: [SubmissionKind, string][] = [
  ["foods", "Alimentos"],
  ["posts", "Denuncias"],
  ["bugs", "Bugs"],
];

export default function MySubmissionsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AppStackParamList, "MySubmissions">>();
  const theme = useThemePalette();
  const styles = useThemedStyles(supportStyles);
  const [kind, setKind] = useState<SubmissionKind>(
    route.params?.kind ?? "foods",
  );
  const [items, setItems] = useState<OwnSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const loading = useRef(false);
  const load = useCallback(
    async (next: number, refresh = false) => {
      const current = ++generation.current;
      loading.current = true;
      setBusy(true);
      setRefreshing(refresh);
      setError("");
      try {
        const result = await rankingUpApiClient.getMySubmissions(kind, next);
        if (current !== generation.current) return;
        setItems((existing) =>
          next === 1
            ? result.items
            : [
                ...existing,
                ...result.items.filter(
                  (item) => !existing.some((prior) => prior.id === item.id),
                ),
              ],
        );
        setPage(next);
        setTotal(result.total);
      } catch (cause) {
        if (current === generation.current)
          setError(getErrorMessage(cause, "No se pudieron cargar tus envíos."));
      } finally {
        if (current === generation.current) {
          setBusy(false);
          setRefreshing(false);
          loading.current = false;
        }
      }
    },
    [kind],
  );
  useFocusEffect(
    useCallback(() => {
      setItems([]);
      setTotal(0);
      setPage(0);
      void load(1);
      return () => {
        generation.current++;
        loading.current = false;
      };
    }, [load]),
  );
  const render = ({ item }: { item: OwnSubmission }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>
          {item.food_name ??
            item.title ??
            (item.reason ? reportReasons[item.reason] : "Denuncia")}
        </Text>
        <Text style={styles.status}>
          {statuses[item.status] ?? item.status}
        </Text>
      </View>
      <Text style={styles.cardDate}>
        {new Date(item.created_at).toLocaleString("es-CL")}
      </Text>
      {item.food_name ? (
        <>
          <Text style={styles.cardBody}>
            {item.serving_amount} {item.serving_unit} · {item.calories} kcal ·
            Proteína: {item.protein} g · Carbohidratos: {item.carbs} g · Grasas:{" "}
            {item.fat} g
          </Text>
          {item.original_values &&
          [
            "food_name",
            "serving_amount",
            "serving_unit",
            "calories",
            "protein",
            "carbs",
            "fat",
          ].some(
            (key) =>
              String(item.original_values?.[key]) !==
              String(item[key as keyof OwnSubmission]),
          ) ? (
            <Text style={styles.helper}>
              El equipo corrigió los datos antes de aprobar. Aporte original:{" "}
              {String(item.original_values.food_name)} ·{" "}
              {String(item.original_values.serving_amount)}{" "}
              {String(item.original_values.serving_unit)} ·{" "}
              {String(item.original_values.calories)} kcal
            </Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.cardBody}>
          {item.details || item.description || "Tu denuncia está registrada."}
        </Text>
      )}
      {item.review_note || item.public_response ? (
        <View style={styles.response}>
          <Text style={styles.responseLabel}>RESPUESTA DEL EQUIPO</Text>
          <Text style={styles.responseText}>
            {item.review_note ?? item.public_response}
          </Text>
        </View>
      ) : (
        <Text style={styles.helper}>
          La respuesta del equipo aparecerá aquí.
        </Text>
      )}
    </View>
  );
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
        <Text style={styles.headerTitle}>MIS ENVÍOS</Text>
        <Pressable
          accessibilityLabel="Actualizar mis envíos"
          style={styles.iconButton}
          onPress={() => void load(1, true)}
        >
          <Ionicons name="refresh" size={21} color={theme.accent} />
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {tabs.map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === value }}
            onPress={() => setKind(value)}
            style={[styles.tab, kind === value && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, kind === value && styles.tabTextActive]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void load(page || 1)}
          style={[styles.error, { marginHorizontal: 20 }]}
        >
          <Text style={styles.errorText}>{error} Toca para reintentar.</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={render}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 5,
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(1, true)}
            tintColor={theme.accent}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!loading.current && items.length < total) void load(page + 1);
        }}
        ListEmptyComponent={
          busy ? (
            <ActivityIndicator
              color={theme.accent}
              size="large"
              style={{ marginTop: 40 }}
            />
          ) : !error ? (
            <View style={styles.empty}>
              <Ionicons
                name="file-tray-outline"
                size={38}
                color={theme.muted}
              />
              <Text style={styles.emptyText}>
                Todavía no tienes envíos en esta sección. Aquí podrás seguir sus
                estados y respuestas.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          busy && items.length ? (
            <ActivityIndicator color={theme.accent} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
