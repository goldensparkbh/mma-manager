import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Broadcast = {
  id: string;
  title: string;
  body: string;
  linkUrl?: string;
  createdAt?: string;
};

export function WebBroadcastListener() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [active, setActive] = useState<Broadcast | null>(null);
  const queueRef = useRef<Broadcast[]>([]);
  const shownRef = useRef<Set<string>>(new Set());

  const { data: unread = [] } = useQuery<Broadcast[]>({
    queryKey: ["/api/notifications/broadcasts/unread"],
    queryFn: () => apiJson("/api/notifications/broadcasts/unread"),
    enabled: !!user && !user.isPlatformAdmin,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });

  const ack = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/api/notifications/broadcasts/${id}/ack`, { method: "POST" }),
  });

  useEffect(() => {
    if (!unread.length) return;
    for (const b of unread) {
      if (!shownRef.current.has(b.id)) {
        queueRef.current.push(b);
        shownRef.current.add(b.id);
      }
    }
    if (!active && queueRef.current.length) {
      setActive(queueRef.current.shift()!);
    }
  }, [unread, active]);

  const dismiss = (openLink?: boolean) => {
    if (!active) return;
    const id = active.id;
    const url = active.linkUrl;
    ack.mutate(id);
    setActive(null);
    if (openLink && url) window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      if (queueRef.current.length) setActive(queueRef.current.shift()!);
    }, 300);
  };

  if (!user || user.isPlatformAdmin) return null;

  return (
    <AlertDialog open={!!active} onOpenChange={(open) => !open && dismiss(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{active?.title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap text-base text-foreground">
            {active?.body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => dismiss(false)}>{t("common.close")}</AlertDialogAction>
          {active?.linkUrl ? (
            <AlertDialogAction onClick={() => dismiss(true)}>{t("platformAdmin.push.openLink")}</AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
