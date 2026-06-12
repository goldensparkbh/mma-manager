import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useRouter } from "expo-router";
import {
  BookingsIllustration,
  ClassesIllustration,
  DiscoverIllustration,
  PaymentsIllustration,
  QrIllustration,
} from "@/lib/illustrations";
import { PrimaryButton } from "@/lib/components";
import { useI18n } from "@/lib/i18n";
import * as storage from "@/lib/storage";
import { spacing } from "@/lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  id: string;
  Illustration: React.ComponentType<{ size?: number }>;
  titleKey: string;
  bodyKey: string;
};

const SLIDES: Slide[] = [
  { id: "welcome", Illustration: DiscoverIllustration, titleKey: "onboarding.slide1Title", bodyKey: "onboarding.slide1Body" },
  { id: "classes", Illustration: ClassesIllustration, titleKey: "onboarding.slide2Title", bodyKey: "onboarding.slide2Body" },
  { id: "qr", Illustration: QrIllustration, titleKey: "onboarding.slide3Title", bodyKey: "onboarding.slide3Body" },
  { id: "pay", Illustration: PaymentsIllustration, titleKey: "onboarding.slide4Title", bodyKey: "onboarding.slide4Body" },
  { id: "book", Illustration: BookingsIllustration, titleKey: "onboarding.slide5Title", bodyKey: "onboarding.slide5Body" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await storage.setOnboardingComplete();
    router.replace("/login");
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const next = () => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <LinearGradient colors={["#004aad", "#003580", "#002654"]} style={styles.root}>
      <View style={styles.topBar}>
        <Image source={require("../assets/nawady-logo-white.png")} style={styles.brandLogo} contentFit="contain" />
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>{t("onboarding.skip")}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <item.Illustration size={220} />
            <Text style={styles.title}>{t(item.titleKey)}</Text>
            <Text style={styles.body}>{t(item.bodyKey)}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton
          label={index === SLIDES.length - 1 ? t("onboarding.getStarted") : t("onboarding.next")}
          icon={index === SLIDES.length - 1 ? "log-in" : "chevron-forward"}
          onPress={next}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: 8,
  },
  brandLogo: { width: 120, height: 44 },
  skip: { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: 16,
    paddingBottom: 24,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center", marginTop: 8 },
  body: { fontSize: 16, color: "#94a3b8", textAlign: "center", lineHeight: 24, maxWidth: 320 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 16 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
  dotActive: { width: 24, backgroundColor: "#ffffff" },
});
