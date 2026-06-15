import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ClubMapView } from "@/lib/clubMap";
import { ExploreTopBar, Screen } from "@/lib/components";
import { useDiscoverClubsMap } from "@/lib/discover";
import { useI18n } from "@/lib/i18n";
import { spacing, useThemeColors } from "@/lib/theme";

export default function ClubsMapScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const { data, isLoading, isError, refetch, isRefetching } = useDiscoverClubsMap({
    q: query || undefined,
    country: country || undefined,
    city: city || undefined,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ExploreTopBar value={query} onChangeText={setQuery} placeholder={t("clubs.search")} />
      <Screen scroll padTop={false} refreshing={isRefetching} onRefresh={onRefresh} style={styles.screen}>
        <ClubMapView
          clubs={data?.clubs ?? []}
          loading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          query={query}
          country={country}
          city={city}
          onCountryChange={setCountry}
          onCityChange={setCity}
          fullScreen
          showFilters
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { paddingTop: spacing.sm, flex: 1 },
});
