import { format } from "date-fns";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, Card, PrimaryButton, SectionTitle } from "@/lib/components";
import { useTypography } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";
import type { AccountMember } from "@/lib/types";

type ClubMemberRowProps = {
  member: AccountMember;
  accent: string;
  onShowQr: (member: AccountMember) => void;
  onRenew: (member: AccountMember) => void;
};

export function ClubMemberRow({ member, accent, onShowQr, onRenew }: ClubMemberRowProps) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { t } = useI18n();

  const untilLabel = member.hasActiveSubscription
    ? member.packageType === "sessions"
      ? t("member.sessionsLeftCount", { count: member.sessionsRemaining ?? 0 })
      : member.memberUntil
        ? t("member.validUntil") + " " + format(new Date(member.memberUntil), "d MMM yyyy")
        : t("member.active")
    : t("member.noPlan");

  return (
    <Card style={[styles.row, { borderColor: withAlpha(accent, 0.25) }]}>
      <View style={styles.rowMain}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: colors.text }, typo.style("bold")]} numberOfLines={1}>
            {member.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }, typo.style("regular")]} numberOfLines={1}>
            {member.age != null ? t("member.ageYears", { age: member.age }) : ""}
            {member.age != null ? " · " : ""}
            {untilLabel}
          </Text>
        </View>
        {member.hasActiveSubscription ? (
          <Pressable
            onPress={() => onShowQr(member)}
            style={[styles.actionBtn, { backgroundColor: withAlpha(accent, 0.12) }]}
            accessibilityRole="button"
            accessibilityLabel={t("member.showQr")}
          >
            <Text style={[styles.actionText, { color: accent }, typo.style("semibold")]}>{t("member.qrShort")}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => onRenew(member)}
            style={[styles.actionBtn, { backgroundColor: withAlpha(accent, 0.12) }]}
            accessibilityRole="button"
            accessibilityLabel={t("member.renewPay")}
          >
            <Text style={[styles.actionText, { color: accent }, typo.style("semibold")]}>{t("member.renew")}</Text>
          </Pressable>
        )}
      </View>
      {member.hasActiveSubscription && member.planName ? (
        <Badge label={member.planName} tone="success" />
      ) : null}
    </Card>
  );
};

type ClubMembersSectionProps = {
  members: AccountMember[];
  accent: string;
  clubSlug: string;
  loading?: boolean;
  onShowQr: (member: AccountMember) => void;
  onRenew: (member: AccountMember) => void;
};

const PREVIEW_LIMIT = 3;

export function ClubMembersSection({
  members,
  accent,
  clubSlug,
  loading,
  onShowQr,
  onRenew,
}: ClubMembersSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const typo = useTypography();
  const { t } = useI18n();

  if (loading) return null;
  if (!members.length) return null;

  const preview = members.slice(0, PREVIEW_LIMIT);
  const hasMore = members.length > PREVIEW_LIMIT;

  return (
    <View style={styles.section}>
      <SectionTitle title={t("member.myMembers")} />
      {preview.map((m) => (
        <ClubMemberRow key={m.id} member={m} accent={accent} onShowQr={onShowQr} onRenew={onRenew} />
      ))}
      {hasMore ? (
        <Pressable
          onPress={() => router.push(`/club/${clubSlug}/members`)}
          style={[styles.seeAll, { borderColor: colors.border }]}
        >
          <Text style={[styles.seeAllText, { color: accent }, typo.style("semibold")]}>
            {t("member.seeAllMembers", { count: members.length })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MemberQrModal({
  visible,
  member,
  onClose,
}: {
  visible: boolean;
  member: AccountMember | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const typo = useTypography();

  if (!member) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.qrModal, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Text style={[styles.qrHeading, typo.style("bold")]}>{member.name}</Text>
        <Text style={[styles.qrHint, typo.style("regular")]}>{t("member.qrHint")}</Text>
        {member.checkInUrl ? (
          <View style={styles.qrBox}>
            <QRCode value={member.checkInUrl} size={240} backgroundColor="#fff" />
          </View>
        ) : null}
        <PrimaryButton label={t("common.close")} onPress={onClose} />
      </View>
    </Modal>
  );
}

export function PurchaseMemberModal({
  visible,
  members,
  packageName,
  accent,
  loading,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  members: AccountMember[];
  packageName: string;
  accent: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (choice: { memberId?: string; newMember?: { name: string; age?: number } }) => void;
}) {
  const colors = useThemeColors();
  const typo = useTypography();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedId, setSelectedId] = useState<string>("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const inactiveMembers = members.filter((m) => !m.hasActiveSubscription);

  const reset = () => {
    setMode(inactiveMembers.length ? "existing" : "new");
    setSelectedId(inactiveMembers[0]?.id || "");
    setName("");
    setAge("");
  };

  const handleConfirm = () => {
    if (mode === "new") {
      if (!name.trim()) return;
      onConfirm({
        newMember: {
          name: name.trim(),
          age: age.trim() ? Number(age) : undefined,
        },
      });
      return;
    }
    const id = selectedId || inactiveMembers[0]?.id;
    if (!id) {
      setMode("new");
      return;
    }
    onConfirm({ memberId: id });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={reset}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typo.style("bold")]}>{t("member.whoIsThisFor")}</Text>
          <Text style={[styles.modalSub, { color: colors.textMuted }, typo.style("regular")]}>{packageName}</Text>

          {inactiveMembers.length > 0 ? (
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode("existing")}
                style={[styles.modeChip, mode === "existing" && { backgroundColor: withAlpha(accent, 0.15), borderColor: accent }]}
              >
                <Text style={[styles.modeChipText, { color: mode === "existing" ? accent : colors.textMuted }, typo.style("semibold")]}>
                  {t("member.existingMember")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("new")}
                style={[styles.modeChip, mode === "new" && { backgroundColor: withAlpha(accent, 0.15), borderColor: accent }]}
              >
                <Text style={[styles.modeChipText, { color: mode === "new" ? accent : colors.textMuted }, typo.style("semibold")]}>
                  {t("member.addNewMember")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {mode === "existing" && inactiveMembers.length > 0 ? (
            <View style={styles.choiceList}>
              {inactiveMembers.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setSelectedId(m.id)}
                  style={[
                    styles.choiceRow,
                    { borderColor: selectedId === m.id ? accent : colors.border },
                    selectedId === m.id && { backgroundColor: withAlpha(accent, 0.08) },
                  ]}
                >
                  <Text style={[styles.choiceName, { color: colors.text }, typo.style("semibold")]}>{m.name}</Text>
                  {m.age != null ? (
                    <Text style={[styles.choiceMeta, { color: colors.textMuted }, typo.style("regular")]}>
                      {t("member.ageYears", { age: m.age })}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t("member.memberName")}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { color: colors.text, borderColor: colors.border }, typo.style("regular")]}
              />
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder={t("member.memberAge")}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                style={[styles.input, { color: colors.text, borderColor: colors.border }, typo.style("regular")]}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <View style={styles.modalAction}>
              <PrimaryButton label={t("common.cancel")} variant="outline" onPress={onClose} />
            </View>
            <View style={styles.modalAction}>
              <PrimaryButton label={t("member.continuePay")} loading={loading} onPress={handleConfirm} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm, gap: spacing.sm },
  row: { gap: spacing.xs, paddingVertical: spacing.sm },
  rowMain: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: 15, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 17 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md },
  actionText: { fontSize: 12 },
  seeAll: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  seeAllText: { fontSize: 14 },
  qrModal: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  qrHeading: { color: "#fff", fontSize: 22 },
  qrHint: { color: "#94a3b8", fontSize: 14, textAlign: "center" },
  qrBox: { backgroundColor: "#fff", padding: 20, borderRadius: 20 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    gap: spacing.sm,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18 },
  modalSub: { fontSize: 13, marginBottom: 4 },
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeChipText: { fontSize: 13 },
  choiceList: { gap: spacing.xs, maxHeight: 180 },
  choiceRow: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  choiceName: { fontSize: 15 },
  choiceMeta: { fontSize: 12, marginTop: 2 },
  form: { gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modalAction: { flex: 1 },
});
