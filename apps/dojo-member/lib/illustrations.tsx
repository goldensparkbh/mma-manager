/** Abstract SVG illustrations only — no human figures. */
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useBranding } from "./branding";

type Props = { size?: number };

export function ClassesIllustration({ size = 160 }: Props) {
  const { accent } = useBranding();
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Rect x="30" y="25" width="140" height="100" rx="16" fill="#e2e8f0" />
      <Rect x="45" y="45" width="50" height="8" rx="4" fill={accent} opacity={0.9} />
      <Rect x="45" y="62" width="90" height="6" rx="3" fill="#94a3b8" />
      <Rect x="45" y="76" width="70" height="6" rx="3" fill="#cbd5e1" />
      <Circle cx="150" cy="95" r="28" fill={accent} opacity={0.15} />
      <Path d="M138 95 L148 105 L165 82" stroke={accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function BookingsIllustration({ size = 160 }: Props) {
  const { accent } = useBranding();
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Circle cx="100" cy="75" r="55" fill={accent} opacity={0.1} />
      <Rect x="65" y="40" width="70" height="70" rx="12" fill="#fff" stroke="#e2e8f0" strokeWidth={3} />
      <Rect x="78" y="55" width="44" height="6" rx="3" fill={accent} />
      <Rect x="78" y="70" width="30" height="5" rx="2" fill="#94a3b8" />
      <Rect x="78" y="82" width="36" height="5" rx="2" fill="#cbd5e1" />
    </Svg>
  );
}

export function PaymentsIllustration({ size = 160 }: Props) {
  const { accent } = useBranding();
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Rect x="35" y="45" width="130" height="80" rx="14" fill="#1e293b" />
      <Rect x="50" y="65" width="40" height="28" rx="6" fill={accent} />
      <Rect x="100" y="70" width="50" height="6" rx="3" fill="#94a3b8" />
      <Rect x="100" y="84" width="35" height="5" rx="2" fill="#64748b" />
      <Circle cx="155" cy="50" r="18" fill="#22c55e" opacity={0.9} />
      <Path d="M147 50 L153 56 L165 44" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function QrIllustration({ size = 180 }: Props) {
  const { accent } = useBranding();
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      <Rect x="20" y="20" width="140" height="140" rx="20" fill="#fff" stroke="#e2e8f0" strokeWidth={4} />
      <Rect x="40" y="40" width="36" height="36" rx="4" fill={accent} />
      <Rect x="104" y="40" width="36" height="36" rx="4" fill={accent} />
      <Rect x="40" y="104" width="36" height="36" rx="4" fill={accent} />
      <Rect x="88" y="88" width="12" height="12" fill="#0f172a" />
      <Rect x="104" y="104" width="8" height="8" fill="#0f172a" />
      <Rect x="120" y="88" width="8" height="20" fill="#0f172a" />
      <Rect x="88" y="120" width="20" height="8" fill="#0f172a" />
    </Svg>
  );
}
