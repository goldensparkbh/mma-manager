import React from "react";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { type ViewStyle } from "react-native";

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}

export function FadeInSoft({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return <Animated.View entering={FadeIn.delay(delay).duration(400)}>{children}</Animated.View>;
}
