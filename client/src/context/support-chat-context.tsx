import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { SupportChatWidget } from "@/components/support-chat-widget";

type SupportChatContextValue = {
  open: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
};

const SupportChatContext = createContext<SupportChatContextValue | null>(null);

export function SupportChatProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((v) => !v), []);

  const value = useMemo(
    () => ({ open, openChat, closeChat, toggleChat }),
    [open, openChat, closeChat, toggleChat],
  );

  return (
    <SupportChatContext.Provider value={value}>
      {children}
      <SupportChatWidget open={open} onOpenChange={setOpen} />
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) {
    return {
      open: false,
      openChat: () => {},
      closeChat: () => {},
      toggleChat: () => {},
    };
  }
  return ctx;
}
