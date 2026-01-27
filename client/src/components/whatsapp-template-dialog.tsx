import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Member } from "@shared/schema";
import { applyWhatsAppTemplate, type WhatsAppTemplate } from "@/lib/whatsapp";
import { useLanguage } from "@/context/language-context";

type WhatsAppTemplateDialogProps = {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: WhatsAppTemplate[];
};

export function WhatsAppTemplateDialog({
  member,
  open,
  onOpenChange,
  templates,
}: WhatsAppTemplateDialogProps) {
  const { t, dir } = useLanguage();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedTemplateId(templates[0]?.id || "");
  }, [open, templates]);

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  const preview = useMemo(() => {
    if (!member) return "";
    if (activeTemplate?.body) {
      return applyWhatsAppTemplate(activeTemplate.body, member, t);
    }
    return applyWhatsAppTemplate(t("dashboard.whatsappFallback"), member, t);
  }, [activeTemplate, member, t]);

  const handleSend = () => {
    if (!member || !activeTemplate) return;
    const phone = member.phone || "";
    const sanitizedPhone = phone.replace(/\D/g, "");
    if (!sanitizedPhone) return;
    window.open(`https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(preview)}`, "_blank");
    onOpenChange(false);
  };

  const canSend = Boolean(member && activeTemplate && member.phone?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle>{t("whatsapp.selectTemplateTitle")}</DialogTitle>
          <DialogDescription>{t("whatsapp.selectTemplateDescription")}</DialogDescription>
        </DialogHeader>

        {templates.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("whatsapp.templateLabel")}</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("whatsapp.selectTemplatePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("whatsapp.previewLabel")}</Label>
              <div className="min-h-[120px] whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {preview}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t("whatsapp.noTemplates")}</p>
            <p>{t("whatsapp.manageTemplatesHint")}</p>
          </div>
        )}

        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSend} disabled={!canSend || templates.length === 0}>
            {t("common.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
