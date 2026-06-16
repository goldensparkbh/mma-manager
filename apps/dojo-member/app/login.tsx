import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { usePublicBranches } from "@/lib/branchAccess";
import { ClubLogo } from "@/lib/clubLogo";
import { PrimaryButton } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import { isValidMemberFullName } from "@/lib/memberNameValidation";
import { radius, spacing, useThemeColors, withAlpha } from "@/lib/theme";

type Step = "phone" | "code" | "name";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const { clubName, login, requestOtp, loginWithOtp, portalInfo, loading, member, slug, setSlug } = useAuth();
  const { t } = useI18n();
  const colors = useThemeColors();
  const accent = portalInfo?.primaryColor || colors.primary;

  const [clubCode, setClubCode] = useState(slug || "");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sentVia, setSentVia] = useState("");

  useEffect(() => {
    if (!loading && member) router.replace("/(member)");
  }, [loading, member, router]);

  useEffect(() => {
    if (params.slug && params.slug !== slug) {
      setSlug(String(params.slug)).catch(() => {});
      setClubCode(String(params.slug));
    }
  }, [params.slug, slug, setSlug]);

  useEffect(() => {
    if (slug) setClubCode(slug);
  }, [slug]);

  const { data: publicBranches = [] } = usePublicBranches(slug);
  const showBranchPicker = publicBranches.length > 1;

  useEffect(() => {
    if (!showBranchPicker) {
      setBranchId("");
      return;
    }
    if (branchId && publicBranches.some((b) => b.id === branchId)) return;
    const def = publicBranches.find((b) => b.isDefault) || publicBranches[0];
    if (def) setBranchId(def.id);
  }, [publicBranches, showBranchPicker, branchId]);

  const ensureClub = async () => {
    const code = clubCode.trim().toLowerCase();
    if (!code) throw new Error(t("login.clubRequired"));
    if (code !== slug) await setSlug(code);
  };

  const sendOtp = async () => {
    setSubmitting(true);
    setError("");
    try {
      await ensureClub();
      const result = await requestOtp(phone);
      setSentVia(result.sentVia);
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (withName?: string) => {
    setSubmitting(true);
    setError("");
    try {
      if (withName && !isValidMemberFullName(withName)) {
        setError(t("member.nameThreeParts"));
        return;
      }
      const result = await loginWithOtp(phone, code, withName, branchId || undefined);
      if (result.needsName) {
        setStep("name");
        return;
      }
      router.replace("/(member)");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[accent, withAlpha(accent, 0.9)]} style={styles.hero}>
          {slug ? <ClubLogo logoUrl={portalInfo?.logoUrl} size={88} style={styles.logo} /> : null}
          <Text style={styles.heroTitle}>{clubName || t("login.title")}</Text>
          <Text style={styles.heroSub}>{t("login.subtitle")}</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {step === "phone" ? (
            <>
              <Text style={[styles.label, { color: colors.textMuted }]}>{t("login.clubCode")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder={t("login.clubCodePlaceholder")}
                autoCapitalize="none"
                value={clubCode}
                onChangeText={setClubCode}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.label, { color: colors.textMuted }]}>{t("login.phone")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder="+973..."
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>{t("login.otpHint")}</Text>
              <PrimaryButton label={t("login.sendCode")} loading={submitting} disabled={!phone || !clubCode} onPress={sendOtp} />
            </>
          ) : null}

          {step === "code" ? (
            <>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {sentVia === "sms" ? t("login.codeSentSms") : sentVia === "email" ? t("login.codeSentEmail") : t("login.codeSentDev")}
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
                placeholderTextColor={colors.textMuted}
              />
              <PrimaryButton label={t("login.verify")} loading={submitting} disabled={code.length < 6} onPress={() => verify()} />
              <Pressable onPress={() => setStep("phone")}>
                <Text style={[styles.link, { color: accent }]}>{t("login.changePhone")}</Text>
              </Pressable>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <Text style={[styles.label, { color: colors.text }]}>{t("login.registerTitle")}</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>{t("login.registerHint")}</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.bg }]}
                placeholder={t("member.memberNamePlaceholder")}
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.hint, { color: colors.textMuted }]}>{t("member.memberNameHint")}</Text>
              {showBranchPicker ? (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{t("club.pickBranch")}</Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]}>{t("club.pickBranchHint")}</Text>
                  <View style={styles.branchList}>
                    {publicBranches.map((b) => {
                      const active = branchId === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setBranchId(b.id)}
                          style={[
                            styles.branchChip,
                            {
                              borderColor: active ? accent : colors.border,
                              backgroundColor: active ? withAlpha(accent, 0.12) : colors.bg,
                            },
                          ]}
                        >
                          <Text style={[styles.branchChipText, { color: active ? accent : colors.text }]}>{b.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}
              <PrimaryButton
                label={t("login.createAccount")}
                loading={submitting}
                disabled={!name.trim() || !isValidMemberFullName(name.trim())}
                onPress={() => verify(name.trim())}
              />
            </>
          ) : null}

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Pressable onPress={() => router.replace("/(discover)")}>
            <Text style={[styles.link, { color: accent }]}>{t("login.browseClubs")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 72, paddingBottom: 36, paddingHorizontal: spacing.lg, alignItems: "center" },
  logo: { width: 88, height: 88, borderRadius: 22, backgroundColor: "#fff", marginBottom: 12 },
  heroTitle: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center" },
  heroSub: { fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8, textAlign: "center" },
  card: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: 12,
    minHeight: 360,
  },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
  },
  error: { textAlign: "center", fontSize: 14 },
  link: { textAlign: "center", marginTop: 8, fontWeight: "600" },
  branchList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  branchChip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  branchChipText: { fontSize: 14, fontWeight: "600" },
});
