import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { Badge, CategoryChip, PrimaryButton, Skeleton } from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { useTypography } from "@/lib/fonts";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useDiscoverMapFilters, useClubTypes, type DiscoverClub } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";

const GCC_REGION: Region = {
  latitude: 25.4,
  longitude: 50.2,
  latitudeDelta: 12,
  longitudeDelta: 14,
};

const COUNTRY_LABELS: Record<string, { en: string; ar: string }> = {
  BH: { en: "Bahrain", ar: "البحرين" },
  SA: { en: "Saudi Arabia", ar: "السعودية" },
  QA: { en: "Qatar", ar: "قطر" },
  OM: { en: "Oman", ar: "عُمان" },
  KW: { en: "Kuwait", ar: "الكويت" },
};

function isValidCoord(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 && !(la === 0 && ln === 0);
}

type Props = {
  clubs: DiscoverClub[];
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  query?: string;
  country?: string;
  city?: string;
  onCountryChange?: (code: string) => void;
  onCityChange?: (city: string) => void;
  fullScreen?: boolean;
  showFilters?: boolean;
};

export function ClubMapView({
  clubs,
  loading,
  isError,
  onRetry,
  query,
  country = "",
  city = "",
  onCountryChange,
  onCityChange,
  fullScreen = false,
  showFilters = true,
}: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const typo = useTypography();
  const { t, clubTypeName, locale } = useI18n();
  const { data: mapFilters } = useDiscoverMapFilters();
  const { data: clubTypes } = useClubTypes();
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<DiscoverClub | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const mappable = useMemo(
    () => clubs.filter((c) => isValidCoord(c.latitude, c.longitude)),
    [clubs],
  );

  const countryLabel = (code: string) => {
    const row = COUNTRY_LABELS[code];
    if (!row) return code;
    return locale === "ar" ? row.ar : row.en;
  };

  const cityOptions = useMemo(() => {
    if (!country) return [];
    return (mapFilters?.cities ?? []).filter((c) => c.country === country);
  }, [mapFilters?.cities, country]);

  const fitAll = () => {
    if (!mapRef.current || mappable.length === 0) return;
    if (mappable.length === 1) {
      const c = mappable[0];
      mapRef.current.animateToRegion(
        { latitude: c.latitude!, longitude: c.longitude!, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        400,
      );
      return;
    }
    mapRef.current.fitToCoordinates(
      mappable.map((c) => ({ latitude: c.latitude!, longitude: c.longitude! })),
      { edgePadding: { top: 100, right: 48, bottom: fullScreen ? 260 : 220, left: 48 }, animated: true },
    );
  };

  useEffect(() => {
    if (mapReady && mappable.length > 0) fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mappable.length, country, city]);

  const selectedSports = useMemo(() => {
    if (!selected) return [];
    return (selected.sportTypeIds?.length ? selected.sportTypeIds : [selected.clubType]).slice(0, 4);
  }, [selected]);

  const filters = showFilters && onCountryChange ? (
    <View style={styles.filtersWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <CategoryChip
          label={t("map.countryAll")}
          active={!country}
          color={colors.primary}
          onPress={() => {
            onCountryChange("");
            onCityChange?.("");
            setSelected(null);
          }}
        />
        {(mapFilters?.countries ?? []).map((c) => (
          <CategoryChip
            key={c.code}
            label={`${countryLabel(c.code)} (${c.count})`}
            active={country === c.code}
            color={colors.primary}
            onPress={() => {
              onCountryChange(c.code);
              onCityChange?.("");
              setSelected(null);
            }}
          />
        ))}
      </ScrollView>
      {country && cityOptions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <CategoryChip
            label={t("map.cityAll")}
            active={!city}
            color={colors.primary}
            onPress={() => {
              onCityChange?.("");
              setSelected(null);
            }}
          />
          {cityOptions.map((c) => (
            <CategoryChip
              key={`${c.country}-${c.city}`}
              label={`${c.city} (${c.count})`}
              active={city === c.city}
              color={colors.primary}
              onPress={() => {
                onCityChange?.(c.city);
                setSelected(null);
              }}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  ) : null;

  if (Platform.OS === "web") {
    return (
      <View>
        {filters}
        <View style={styles.webFallback}>
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.webFallbackText, { color: colors.textMuted }, typo.style("regular", { textAlign: "center" })]}>
            {t("map.webUnsupported")}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View>
        {filters}
        <Skeleton height={fullScreen ? 520 : 420} style={{ marginHorizontal: -spacing.md }} />
      </View>
    );
  }

  if (isError) {
    return (
      <View>
        {filters}
        <QueryErrorState onRetry={onRetry} />
      </View>
    );
  }

  const missingCoords = clubs.length > 0 && mappable.length === 0;

  if (mappable.length === 0) {
    return (
      <View>
        {filters}
        <View style={styles.webFallback}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.webFallbackText, { color: colors.textMuted }, typo.style("regular", { textAlign: "center" })]}>
            {query?.trim() || country || city
              ? t("map.noResults")
              : missingCoords
                ? t("map.coordsMissing")
                : t("map.noLocations")}
          </Text>
          <Text style={[styles.webFallbackHint, { color: colors.textMuted }, typo.style("regular", { textAlign: "center" })]}>
            {missingCoords ? t("map.coordsMissingHint") : t("map.noLocationsHint")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={fullScreen ? styles.fullRoot : undefined}>
      {filters}
      <View style={[styles.wrap, fullScreen && styles.wrapFull]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={GCC_REGION}
          onMapReady={() => {
            setMapReady(true);
            fitAll();
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {mappable.map((club) => {
            const accent = club.primaryColor || getClubTypeVisual(club.clubType).color;
            return (
              <Marker
                key={club.id}
                coordinate={{ latitude: Number(club.latitude), longitude: Number(club.longitude) }}
                onPress={() => setSelected(club)}
                tracksViewChanges={false}
              >
                <View style={[styles.pin, { backgroundColor: accent, borderColor: "#fff" }]}>
                  <Ionicons name="location" size={14} color="#fff" />
                </View>
              </Marker>
            );
          })}
        </MapView>

        <Pressable
          onPress={fitAll}
          style={[styles.fitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={t("map.fitAll")}
        >
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
        </Pressable>

        <View style={[styles.countBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.countText, { color: colors.text }, typo.style("semibold")]}>{mappable.length}</Text>
        </View>

        {selected ? (
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.text }, typo.style("bold")]} numberOfLines={2}>
                  {selected.name}
                </Text>
                {selected.city || selected.location ? (
                  <Text style={[styles.sheetMeta, { color: colors.textMuted }, typo.style("regular")]} numberOfLines={2}>
                    {[selected.city, selected.country ? countryLabel(selected.country) : null, selected.location?.split(",")[0]]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            {selectedSports.length ? (
              <View style={styles.chipRow}>
                {selectedSports.map((typeId) => {
                  const type = clubTypes?.find((ct) => ct.id === typeId);
                  const label = type ? clubTypeName(type.nameEn, type.nameAr) : typeId.replace(/_/g, " ");
                  const vis = getClubTypeVisual(typeId);
                  return (
                    <View key={typeId} style={[styles.sportChip, { backgroundColor: withAlpha(vis.color, 0.12) }]}>
                      <Text style={[styles.sportChipText, { color: vis.color }, typo.style("semibold")]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {selected.phone ? (
              <Text style={[styles.sheetMeta, { color: colors.textMuted }, typo.style("regular")]}>{selected.phone}</Text>
            ) : null}

            {selected.upcomingClassCount > 0 ? (
              <Badge label={t("map.upcomingClasses", { count: selected.upcomingClassCount })} tone="success" />
            ) : null}

            <PrimaryButton
              label={t("map.viewClub")}
              icon="arrow-forward"
              onPress={() => router.push(`/club/${selected.portalSlug}`)}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullRoot: { flex: 1 },
  filtersWrap: { gap: spacing.xs, marginBottom: spacing.sm },
  filterRow: { gap: spacing.sm, paddingVertical: 2 },
  wrap: { height: 420, marginHorizontal: -spacing.md, borderRadius: radius.lg, overflow: "hidden" },
  wrapFull: { flex: 1, height: undefined, marginHorizontal: -spacing.md, borderRadius: 0 },
  map: { ...StyleSheet.absoluteFillObject },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  fitBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 13 },
  sheet: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sheetTitle: { fontSize: 17, lineHeight: 22 },
  sheetMeta: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sportChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  sportChipText: { fontSize: 11 },
  webFallback: {
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  webFallbackText: { fontSize: 14, lineHeight: 20 },
  webFallbackHint: { fontSize: 12, lineHeight: 18 },
});
