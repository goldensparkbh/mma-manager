import Svg, { Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

type Props = {
  locale?: "en" | "ar";
  width?: number;
  height?: number;
};

function LogoMark() {
  return (
    <>
      <Defs>
        <LinearGradient id="nawadyMark" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#93c5fd" />
        </LinearGradient>
      </Defs>
      <Path
        d="M8 38 V14 C8 8 12 4 18 4 C24 4 28 8 28 14 V38"
        stroke="url(#nawadyMark)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M34 38 V10 C34 6 38 2 44 2 C50 2 54 6 54 10 V38"
        stroke="url(#nawadyMark)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M60 38 V16 C60 10 64 6 70 6 C76 6 80 10 80 16 V38"
        stroke="url(#nawadyMark)"
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
    </>
  );
}

/** Transparent vector Nawady / نوادي wordmark — no background */
export function NawadyLogo({ locale = "en", width = 240, height = 58 }: Props) {
  const isAr = locale === "ar";

  return (
    <Svg width={width} height={height} viewBox="0 0 240 58">
      <LogoMark />
      <SvgText
        x={96}
        y={38}
        fill="#ffffff"
        fontSize={isAr ? 32 : 30}
        fontWeight="700"
        fontFamily={isAr ? "Cairo_700Bold" : undefined}
        letterSpacing={isAr ? 0 : 0.5}
      >
        {isAr ? "نوادي" : "Nawady"}
      </SvgText>
    </Svg>
  );
}
