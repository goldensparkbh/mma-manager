import { Image } from "expo-image";

type Props = {
  locale?: "en" | "ar";
  width?: number;
  height?: number;
  variant?: "white" | "colored";
};

/** Nawady wordmark from brand assets */
export function NawadyLogo({ width = 240, height = 58, variant = "white" }: Props) {
  const source =
    variant === "colored"
      ? require("../assets/nawady-logo-colored.png")
      : require("../assets/nawady-logo-white.png");

  return <Image source={source} style={{ width, height }} contentFit="contain" />;
}
