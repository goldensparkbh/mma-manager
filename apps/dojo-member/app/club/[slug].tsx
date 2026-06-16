import { useLocalSearchParams, useRouter } from "expo-router";
import { ClubDetailScreen } from "@/lib/clubDetailScreen";
import { QueryErrorState } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { Screen } from "@/lib/components";

export default function ClubDetailRoute() {
  const { slug, renewMemberId } = useLocalSearchParams<{ slug: string; renewMemberId?: string }>();
  const router = useRouter();
  const { t } = useI18n();

  if (!slug) {
    return (
      <Screen>
        <QueryErrorState message={t("club.notFoundSub")} onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <ClubDetailScreen
      slug={slug}
      showBack
      renewMemberId={typeof renewMemberId === "string" ? renewMemberId : undefined}
    />
  );
}
