import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/context/language-context";
import type { CustomFieldDef } from "@shared/clubTypes";

type Props = {
  fields: CustomFieldDef[];
  values: Record<string, string | number | null>;
  onChange: (key: string, value: string) => void;
  readOnly?: boolean;
};

export function MemberCustomFields({ fields, values, onChange, readOnly }: Props) {
  const { language } = useLanguage();
  if (!fields.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => {
        const label = language === "ar" ? field.labelAr : field.label;
        const value = values[field.key] != null ? String(values[field.key]) : "";

        if (readOnly) {
          return (
            <div key={field.key} className="space-y-1">
              <Label>{label}</Label>
              <div className="font-medium">{value || "-"}</div>
            </div>
          );
        }

        if (field.type === "select" && field.options) {
          return (
            <div key={field.key} className="space-y-2">
              <Label>{label}{field.required ? " *" : ""}</Label>
              <Select value={value} onValueChange={(v) => onChange(field.key, v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-2">
            <Label>{label}{field.required ? " *" : ""}</Label>
            <Input
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
