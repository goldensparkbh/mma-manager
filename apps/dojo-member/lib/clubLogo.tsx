import { Image } from "expo-image";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";
import { resolveImageUrl } from "./resolveUrl";

/** Default image when a club has no uploaded logo */
export const CLUB_LOGO_PLACEHOLDER = require("../assets/club-logo-placeholder.png");

export function clubLogoSource(logoUrl?: string | null) {
  const resolved = resolveImageUrl(logoUrl);
  return resolved ? { uri: resolved } : CLUB_LOGO_PLACEHOLDER;
}

export function ClubLogo({
  logoUrl,
  size,
  style,
  contentFit = "contain",
  fill,
}: {
  logoUrl?: string | null;
  size: number;
  style?: StyleProp<ImageStyle>;
  contentFit?: "contain" | "cover";
  /** Fill the parent container (parent must have a defined size). */
  fill?: boolean;
}) {
  return (
    <Image
      source={clubLogoSource(logoUrl)}
      style={[
        fill
          ? [styles.fill, { minHeight: size }]
          : { width: size, height: size, borderRadius: size * 0.22 },
        style,
      ]}
      contentFit={contentFit}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
