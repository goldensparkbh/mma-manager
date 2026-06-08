import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/language-context";
import { apiJson } from "@/lib/api";

type Branch = { id: string; name: string; isDefault?: boolean };

type Props = {
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  allowAll?: boolean;
  className?: string;
};

export function BranchSelect({ value, onChange, label, allowAll, className }: Props) {
  const { t } = useLanguage();
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: () => apiJson("/api/branches"),
  });

  if (branches.length <= 1 && !allowAll) return null;

  const selectValue = value || (allowAll ? "all" : "none");

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === "all" || v === "none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("branches.title")} />
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">{t("common.all")}</SelectItem>}
          {!allowAll && <SelectItem value="none">—</SelectItem>}
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
