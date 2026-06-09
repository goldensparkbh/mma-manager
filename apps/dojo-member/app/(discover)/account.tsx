import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import {
  Card,
  ClubCard,
  DiscoverHero,
  IconRow,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "@/lib/components";
import { getClubTypeVisual } from "@/lib/clubVisuals";
import { getSavedClubs, type SavedClub } from "@/lib/savedClubs";
import { colors, spacing } from "@/lib/theme";

export default function AccountScreen() {
  const router = useRouter();
  const { member, slug, clubName, portalInfo, logout, leaveClub } = useAuth();
  const [saved, setSaved] = useState<SavedClub[]>([]);

  const loadSaved = useCallback(async () => {
    setSaved(await getSavedClubs());
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const onSignOut = async () => {
    await logout();
    router.replace("/(discover)/account");
  };

  const onLeaveClub = async () => {
    await leaveClub();
    router.replace("/(discover)");
  };

  return (
    <Screen scroll>
      <DiscoverHero title="My account" subtitle="Manage membership and saved clubs" />

      {member && slug ? (
        <Card style={styles.gap}>
          <SectionTitle title="Signed in" />
          <IconRow icon="person" label="Member" value={member.name} accent={portalInfo?.primaryColor} />
          <IconRow icon="business" label="Club" value={clubName} accent={portalInfo?.primaryColor} />
          <PrimaryButton
            label="Open my club"
            icon="home"
            onPress={() => router.push("/(member)")}
          />
          <PrimaryButton label="Sign out" variant="outline" onPress={onSignOut} />
          <PrimaryButton label="Switch club" variant="outline" onPress={onLeaveClub} />
        </Card>
      ) : (
        <Card style={styles.gap}>
          <Text style={styles.promptTitle}>Not signed in to a club</Text>
          <Text style={styles.promptSub}>
            Browse clubs, open a profile, and sign in when you want to book or pay.
          </Text>
          <PrimaryButton label="Browse clubs" icon="compass" onPress={() => router.push("/(discover)/clubs")} />
        </Card>
      )}

      <SectionTitle title="Recently viewed" />
      {saved.length === 0 ? (
        <Card>
          <Text style={styles.promptSub}>Clubs you open will appear here for quick access.</Text>
        </Card>
      ) : (
        saved.map((club) => {
          const vis = getClubTypeVisual(club.clubType);
          return (
            <ClubCard
              key={club.slug}
              compact
              name={club.name}
              clubType={vis.label}
              logoUrl={club.logoUrl}
              accent={club.primaryColor || vis.color}
              typeIcon={vis.icon}
              typeColor={vis.color}
              typeColorSoft={vis.colorSoft}
              onPress={() => router.push(`/club/${club.slug}`)}
            />
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  promptTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  promptSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
