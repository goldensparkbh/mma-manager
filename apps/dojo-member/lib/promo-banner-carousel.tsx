import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import { NAWADY_BRAND } from "./brand";
import { Skeleton } from "./components";
import type { DiscoverPromoBanner } from "./discover";
import { useTypography } from "./fonts";
import { useI18n } from "./i18n";
import { resolveImageUrl } from "./resolveUrl";
import { radius, spacing, useThemeColors, withAlpha } from "./theme";

const AUTO_INTERVAL_MS = 4000;
const H_PAD = spacing.md;

type Props = {
  banners: DiscoverPromoBanner[];
  loading?: boolean;
  onBannerPress: (banner: DiscoverPromoBanner) => void;
};

function PromoBannerPlaceholder() {
  const { t } = useI18n();
  const typo = useTypography();
  const pageWidth = Dimensions.get("window").width;
  const bannerWidth = pageWidth - H_PAD * 2;
  const bannerHeight = (bannerWidth * 9) / 16;

  return (
    <View style={[styles.wrap, styles.placeholderWrap]}>
      <View style={[styles.slide, { width: pageWidth }]}>
        <View style={[styles.bannerOuter, { width: bannerWidth, height: bannerHeight }]}>
        <LinearGradient
          colors={[NAWADY_BRAND.primary, NAWADY_BRAND.primaryDark, NAWADY_BRAND.primaryDarker]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.placeholderPattern}>
            <Ionicons name="fitness" size={28} color={withAlpha("#fff", 0.12)} style={styles.patternIconA} />
            <Ionicons name="football" size={24} color={withAlpha("#fff", 0.1)} style={styles.patternIconB} />
            <Ionicons name="water" size={22} color={withAlpha("#fff", 0.1)} style={styles.patternIconC} />
          </View>
          <View style={[styles.placeholderContent, typo.isRtl && styles.placeholderContentRtl]}>
            <View style={styles.placeholderIconCircle}>
              <Ionicons name="megaphone" size={22} color="#fff" />
            </View>
            <Text style={[styles.placeholderTitle, typo.style("bold")]}>{t("explore.adPlaceholder")}</Text>
            <Text style={[styles.placeholderSub, typo.style("regular")]}>{t("explore.adPlaceholderSub")}</Text>
          </View>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>{t("app.name")}</Text>
          </View>
        </LinearGradient>
        </View>
      </View>
    </View>
  );
}

export function PromoBannerCarousel({ banners, loading, onBannerPress }: Props) {
  const colors = useThemeColors();
  const listRef = useRef<FlatList<DiscoverPromoBanner>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const pageWidth = Dimensions.get("window").width;
  const bannerWidth = pageWidth - H_PAD * 2;
  const bannerHeight = (bannerWidth * 9) / 16;

  const scrollTo = useCallback(
    (index: number, animated = true) => {
      listRef.current?.scrollToOffset({ offset: pageWidth * index, animated });
      activeIndexRef.current = index;
      setActiveIndex(index);
    },
    [pageWidth],
  );

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      const next = (activeIndexRef.current + 1) % banners.length;
      scrollTo(next);
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [banners.length, scrollTo]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <View style={[styles.wrap, styles.placeholderWrap]}>
        <View style={[styles.slide, { width: pageWidth }]}>
          <Skeleton height={bannerHeight} style={{ width: bannerWidth, borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }

  if (!banners.length) {
    return <PromoBannerPlaceholder />;
  }

  const renderItem: ListRenderItem<DiscoverPromoBanner> = ({ item }) => {
    const imageUri = resolveImageUrl(item.imageUrl);

    return (
      <View style={[styles.slide, { width: pageWidth }]}>
        <Pressable
          onPress={() => onBannerPress(item)}
          style={({ pressed }) => [styles.bannerOuter, { width: bannerWidth, height: bannerHeight }, pressed && { opacity: 0.94 }]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.bannerImageFull} contentFit="cover" />
          ) : (
            <LinearGradient colors={[NAWADY_BRAND.primary, NAWADY_BRAND.primaryDark]} style={styles.banner} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
        decelerationRate="fast"
        snapToInterval={pageWidth}
        style={{ height: bannerHeight }}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotIdle,
                index === activeIndex && { backgroundColor: colors.primary },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export async function openPromoBannerLink(banner: DiscoverPromoBanner) {
  if (banner.linkUrl?.trim()) {
    const url = banner.linkUrl.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      await Linking.openURL(url);
    }
  }
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md, marginHorizontal: -spacing.md },
  placeholderWrap: { marginBottom: spacing.md },
  slide: { alignItems: "center" },
  bannerOuter: {
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: NAWADY_BRAND.primaryDark,
  },
  banner: { flex: 1, justifyContent: "center" },
  bannerImageFull: { width: "100%", height: "100%" },
  brandMark: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  brandText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 18 },
  dotIdle: { width: 6, backgroundColor: "rgba(0,74,173,0.25)" },
  placeholderPattern: { ...StyleSheet.absoluteFillObject },
  patternIconA: { position: "absolute", top: 18, right: 24 },
  patternIconB: { position: "absolute", bottom: 20, right: 48 },
  patternIconC: { position: "absolute", top: 36, left: 20 },
  placeholderContent: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  placeholderContentRtl: {},
  placeholderIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24,
  },
  placeholderSub: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
