/**
 * Global Search Screen (Figma 795-6009, 791-1184, 791-1219, 791-1314, 791-1412, 795-5958)
 * Search across people, tee times, groups, and courses.
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { Search, User, Calendar, Users, MapPin } from "lucide-react-native";
import { ScreenShell, AppHeader } from "../ui";
import {
  searchApi,
  type SearchUser,
  type SearchTeeTime,
  type SearchGroup,
  type SearchCourse,
  type GlobalSearchResult,
} from "../services/api";
import { spacing, fontSize, radii } from "../ui/theme/tokens";
import { useColors } from "../ui/theme/ThemeContext";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delayMs]);
  return debounced;
}

export default function GlobalSearchScreen({
  navigation,
}: {
  navigation: { goBack: () => void; navigate: (screen: string, params?: object) => void };
}) {
  const colors = useColors();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchApi.search(q);
      setResult({
        users: res.users ?? [],
        teeTimes: res.teeTimes ?? [],
        groups: res.groups ?? [],
        courses: res.courses ?? [],
      });
    } catch (e) {
      setResult(null);
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery);
  }, [debouncedQuery, runSearch]);

  const hasResults =
    result &&
    (result.users.length > 0 ||
      result.teeTimes.length > 0 ||
      result.groups.length > 0 ||
      result.courses.length > 0);
  const showEmpty =
    debouncedQuery.length >= MIN_QUERY_LENGTH &&
    !loading &&
    result !== null &&
    !hasResults;

  const onUser = useCallback(
    (u: SearchUser) => {
      navigation?.navigate("FriendProfile", { userId: u.id });
    },
    [navigation],
  );
  const onTeeTime = useCallback(
    (t: SearchTeeTime) => {
      navigation?.navigate("TeeTimeDetail", { teeTimeId: t.id });
    },
    [navigation],
  );
  const onGroup = useCallback(
    (g: SearchGroup) => {
      navigation?.navigate("GroupProfile", { groupId: g.id });
    },
    [navigation],
  );
  const onCourse = useCallback(
    (c: SearchCourse) => {
      navigation?.navigate("CreateTeeTime", {
        courseName: c.name,
        courseLocation: c.location || [c.city, c.state].filter(Boolean).join(", "),
      });
    },
    [navigation],
  );

  return (
    <ScreenShell>
      <AppHeader title="Search" onBack={navigation?.goBack} />
      <View style={[styles.searchBarWrap, { backgroundColor: colors.surfaceSecondary }]}>
        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people, tee times, groups, courses..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>
      {query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
        <View style={styles.hint}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Type at least {MIN_QUERY_LENGTH} characters to search
          </Text>
        </View>
      )}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {error && (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
      {showEmpty && (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No results for "{debouncedQuery}"
          </Text>
        </View>
      )}
      {hasResults && result && !loading && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {result.users.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                People
              </Text>
              {result.users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => onUser(u)}
                  activeOpacity={0.7}
                >
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceTertiary }]}>
                      <User size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {u.name || u.username || "Unknown"}
                    </Text>
                    {u.username && (
                      <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{u.username}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {result.teeTimes.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Tee Times
              </Text>
              {result.teeTimes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => onTeeTime(t)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.surfaceTertiary }]}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {t.courseName}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {t.teeDate} · {t.teeTime}
                      {t.courseLocation ? ` · ${t.courseLocation}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {result.groups.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Groups
              </Text>
              {result.groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => onGroup(g)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: g.color || colors.surfaceTertiary },
                    ]}
                  >
                    <Users size={20} color="#fff" />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                      {g.memberCount} member{g.memberCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {result.courses.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Courses
              </Text>
              {result.courses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => onCourse(c)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconWrap, { backgroundColor: colors.surfaceTertiary }]}>
                    <MapPin size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    {(c.location || c.city) && (
                      <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                        {c.location || [c.city, c.state].filter(Boolean).join(", ")}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  hint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  hintText: { fontFamily: "Inter_400Regular", fontSize: fontSize.sm },
  center: {
    paddingVertical: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: fontSize.sm },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: fontSize.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing["3xl"] },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fontSize.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: radii.full },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: fontSize.base,
  },
  rowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: fontSize.xs,
    marginTop: spacing["2xs"],
  },
});
