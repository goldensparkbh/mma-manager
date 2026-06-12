import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import type { ComponentProps } from "react";

const BG = "#004aad";
const PATTERN = "#003580";

const SPORT_ICONS: ComponentProps<typeof Ionicons>["name"][] = [
  "football",
  "basketball",
  "tennisball",
  "barbell",
  "fitness",
  "body",
  "bicycle",
  "water",
  "boat",
  "golf",
  "american-football",
  "baseball",
];

const PATTERN_LAYOUT: { name: ComponentProps<typeof Ionicons>["name"]; top: `${number}%`; left: `${number}%`; size: number; rotate: string }[] = [
  { name: "football", top: "8%", left: "6%", size: 36, rotate: "-15deg" },
  { name: "basketball", top: "14%", left: "78%", size: 42, rotate: "12deg" },
  { name: "tennisball", top: "28%", left: "22%", size: 28, rotate: "8deg" },
  { name: "barbell", top: "22%", left: "55%", size: 34, rotate: "-20deg" },
  { name: "fitness", top: "42%", left: "8%", size: 32, rotate: "5deg" },
  { name: "body", top: "38%", left: "88%", size: 38, rotate: "-8deg" },
  { name: "bicycle", top: "55%", left: "18%", size: 40, rotate: "15deg" },
  { name: "water", top: "52%", left: "72%", size: 30, rotate: "-12deg" },
  { name: "golf", top: "68%", left: "42%", size: 34, rotate: "10deg" },
  { name: "american-football", top: "72%", left: "8%", size: 36, rotate: "-18deg" },
  { name: "baseball", top: "78%", left: "82%", size: 32, rotate: "20deg" },
  { name: "boat", top: "86%", left: "28%", size: 30, rotate: "-5deg" },
];

export function BrandedSplash() {
  return (
    <View style={styles.root}>
      {PATTERN_LAYOUT.map((item) => (
        <View key={`${item.name}-${item.top}`} style={[styles.iconWrap, { top: item.top, left: item.left }]}>
          <Ionicons
            name={item.name}
            size={item.size}
            color={PATTERN}
            style={{ transform: [{ rotate: item.rotate }], opacity: 0.35 }}
          />
        </View>
      ))}
      <Image source={require("../assets/nawady-logo-white.png")} style={styles.logo} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    position: "absolute",
  },
  logo: {
    width: 260,
    height: 120,
    zIndex: 2,
  },
});

export { BG as SPLASH_BG, SPORT_ICONS };
