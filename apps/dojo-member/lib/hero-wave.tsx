import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

/** Wavy bottom edge for hero banners — fills with page background color */
export function HeroWave({ color, height = 32 }: { color: string; height?: number }) {
  return (
    <View style={{ position: "absolute", bottom: -1, left: 0, right: 0, height, zIndex: 2 }}>
      <Svg width="100%" height={height} viewBox="0 0 390 32" preserveAspectRatio="none">
        <Path
          d="M0,14 C48,30 97,4 146,16 C195,28 244,6 293,18 C342,30 366,22 390,12 L390,32 L0,32 Z"
          fill={color}
        />
      </Svg>
    </View>
  );
}
