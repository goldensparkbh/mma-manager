import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiJson } from "@/lib/api";
import { useLanguage } from "@/context/language-context";

type Conversation = { id: string };
type Message = {
  id: string;
  senderType: string;
  senderName?: string;
  body: string;
  createdAt?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportChatWidget({ open, onOpenChange }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversation } = useQuery<Conversation>({
    queryKey: ["/api/tenant/support/conversation"],
    queryFn: () => apiJson("/api/tenant/support/conversation"),
    enabled: open,
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/tenant/support/messages", conversation?.id],
    queryFn: () => apiJson(`/api/tenant/support/messages?conversationId=${conversation!.id}`),
    enabled: open && !!conversation?.id,
    refetchInterval: open ? 5000 : false,
  });

  const sendMessage = useMutation({
    mutationFn: async (body: string) => {
      return apiJson("/api/tenant/support/messages", {
        method: "POST",
        body: JSON.stringify({ conversationId: conversation!.id, body }),
      });
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/support/messages", conversation?.id] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed bottom-6 end-6 z-[9990] flex flex-col items-end gap-2 pointer-events-none max-md:bottom-20">
        {!open && (
          <span className="pointer-events-none rounded-full bg-card px-3 py-1 text-xs font-medium shadow-md border text-foreground">
            {t("support.fabLabel")}
          </span>
        )}
        <Button
          size="icon"
          className={cn(
            "pointer-events-auto h-14 w-14 rounded-full shadow-xl ring-4 ring-primary/25",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            !open && "animate-pulse hover:animate-none",
            open && "scale-95",
          )}
          onClick={() => onOpenChange(!open)}
          aria-label={t("support.openChat")}
          data-testid="button-support-chat"
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
        </Button>
      </div>

      {open && (
        <div
          className="fixed bottom-24 end-6 z-[9990] flex h-[min(70vh,520px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border-2 border-primary/20 bg-card shadow-2xl max-md:bottom-36"
          role="dialog"
          aria-label={t("support.title")}
        >
          <div className="border-b bg-primary/5 px-4 py-3">
            <p className="font-semibold">{t("support.title")}</p>
            <p className="text-xs text-muted-foreground">{t("support.subtitle")}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    msg.senderType === "tenant_user"
                      ? "ms-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {msg.senderType !== "tenant_user" && (
                    <p className="text-[10px] font-semibold uppercase opacity-70 mb-1">
                      {msg.senderName || (msg.senderType === "bot" ? "Assistant" : "Support")}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("support.placeholder")}
              rows={2}
              className="min-h-0 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim() && conversation?.id) sendMessage.mutate(draft.trim());
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              disabled={!draft.trim() || sendMessage.isPending || !conversation?.id}
              onClick={() => sendMessage.mutate(draft.trim())}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
