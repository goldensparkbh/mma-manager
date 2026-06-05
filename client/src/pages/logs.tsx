import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { ActivityLog } from "@shared/schema";
import { useLanguage } from "@/context/language-context";

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t, language } = useLanguage();

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/logs"],
  });

  const filteredLogs = logs?.filter((log) => {
    const query = searchQuery.trim();
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      log.action.toLowerCase().includes(lowerQuery) ||
      log.entityType.toLowerCase().includes(lowerQuery) ||
      log.description?.toLowerCase()?.includes(lowerQuery) ||
      log.entityId?.toLowerCase()?.includes(lowerQuery)
    );
  });

  const formatDate = (value: string | Date) => {
    const date = new Date(value);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('logs.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('logs.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">{t('logs.title')}</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-logs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t('logs.action')}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t('common.description')}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t('logs.details')}</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover-elevate">
                      <td className="py-3 px-3">
                        <Badge variant="secondary">{log.action}</Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{log.description || "-"}</td>
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <p className="font-medium">{log.entityType}</p>
                          <p className="text-xs text-muted-foreground">{log.entityId || "-"}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      {searchQuery ? t('common.noResults') : t('common.noLogs')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
