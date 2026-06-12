import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { ClubDetailScreen } from "@/lib/clubDetailScreen";
import { useTheme } from "@/lib/theme";

export default function MemberHomeScreen() {
  const { loading, member, slug } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!member || !slug) return <Redirect href="/(discover)" />;

  return <ClubDetailScreen slug={slug} showBack={false} />;
}
