import { format } from "date-fns";
import { StyleSheet, Text } from "react-native";
import { Card, Screen, StaffHeader } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useBookings, useSessions } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme";

export default function RegistrationsScreen() {
  const { t, dateLocale } = useI18n();
  const typo = useTypography();
  const colors = useThemeColors();
  const { data: bookings = [], refetch, isRefetching } = useBookings();
  const { data: sessions = [] } = useSessions();
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => refetch()}>
      <StaffHeader title={t("registrations.title")} subtitle={t("registrations.subtitle")} />
      {bookings.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }, typo.style("regular")]}>{t("registrations.empty")}</Text>
      ) : (
        bookings.map((b) => {
          const session = sessionMap.get(b.sessionId);
          return (
            <Card key={b.id}>
              <Text style={[styles.name, { color: colors.text }, typo.style("bold")]}>{b.memberName || t("registrations.member")}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }, typo.style("regular")]}>{session?.name || t("registrations.session")}</Text>
              {session?.startsAt ? (
                <Text style={[styles.meta, { color: colors.textMuted }, typo.style("regular")]}>
                  {format(new Date(session.startsAt), "EEE, MMM d · h:mm a", { locale: dateLocale })}
                </Text>
              ) : null}
              {b.status ? (
                <Text style={[styles.status, { color: colors.primary }, typo.style("bold")]}>{b.status}</Text>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13, marginTop: 4 },
  status: { fontSize: 11, fontWeight: "700", marginTop: 6, textTransform: "uppercase" },
  empty: { textAlign: "center", marginTop: 32 },
});
