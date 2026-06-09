/** Abstract SVG illustrations only — no human figures. */
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "./theme";

export function DashboardIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 200 140">
      <Rect x="25" y="20" width="150" height="100" rx="16" fill={colors.card} stroke={colors.border} strokeWidth={2} />
      <Rect x="40" y="40" width="45" height="32" rx="8" fill={colors.primary} opacity={0.85} />
      <Rect x="95" y="45" width="65" height="6" rx="3" fill="#94a3b8" />
      <Rect x="95" y="58" width="50" height="5" rx="2" fill="#64748b" />
      <Circle cx="62" cy="95" r="16" fill="#22c55e" opacity={0.9} />
      <Path d="M55 95 L61 101 L70 88" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function ScanIllustration({ size = 140 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="20" y="20" width="120" height="120" rx="16" fill="#fff" opacity={0.1} />
      <Rect x="45" y="45" width="30" height="30" rx="4" fill={colors.primary} />
      <Rect x="85" y="45" width="30" height="30" rx="4" fill={colors.primary} />
      <Rect x="45" y="85" width="30" height="30" rx="4" fill={colors.primary} />
    </Svg>
  );
}
