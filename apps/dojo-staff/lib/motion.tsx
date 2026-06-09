import React from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

export function FadeInView({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)}>{children}</Animated.View>
  );
}
