import { useLocalSearchParams, useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ClubMemberRow, MemberQrModal } from "@/lib/clubMembers";
import { Screen, SectionTitle, Skeleton } from "@/lib/components";
import { QueryErrorState } from "@/lib/errors";
import { useClubProfile } from "@/lib/discover";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { useAccountMembers } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useTypography } from "@/lib/fonts";
import { spacing, useThemeColors } from "@/lib/theme";
import type { AccountMember } from "@/lib/types";

export default function ClubMembersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t, isRtl } = useI18n();
  const typo = useTypography();
  const clubSlug = slug || "";

  const { data: profile } = useClubProfile(clubSlug);
  const { data: members, isLoading, isError, refetch } = useAccountMembers();
  const [qrMember, setQrMember] = useState<AccountMember | null>(null);

  const vis = getClubTypeVisual(profile?.clubType);
  const accent = profile?.primaryColor || vis.color;

  const onRenew = (member: AccountMember) => {
    router.push({ pathname: `/club/${clubSlug}`, params: { renewMemberId: member.id } });
  };

  if (!clubSlug) {
    return (
      <Screen>
        <QueryErrorState message={t("club.notFoundSub")} onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top, direction: isRtl ? "rtl" : "ltr" }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Ionicons name={isRtl ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.text }, typo.style("bold")]}>{t("member.myMembers")}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Screen scroll onRefresh={() => refetch()} style={{ flex: 1 }}>
        <SectionTitle title={profile?.name || ""} />
        <View style={isRtl ? styles.listRtl : undefined}>
        {isLoading ? (
          <>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </>
        ) : isError ? (
          <QueryErrorState onRetry={() => refetch()} />
        ) : (
          (members ?? []).map((m) => (
            <ClubMemberRow
              key={m.id}
              member={m}
              accent={accent}
              onShowQr={async (member) => {
                const hw = await LocalAuthentication.hasHardwareAsync();
                if (hw) {
                  const auth = await LocalAuthentication.authenticateAsync({ promptMessage: t("member.showQr") });
                  if (!auth.success) return;
                }
                setQrMember(member);
              }}
              onRenew={onRenew}
            />
          ))
        )}
        </View>
      </Screen>

      <MemberQrModal visible={!!qrMember} member={qrMember} onClose={() => setQrMember(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  topTitle: { fontSize: 17 },
  listRtl: { direction: "rtl" },
});
