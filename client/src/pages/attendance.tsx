import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { Calendar, LogIn, QrCode, Search, UserCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeFormat } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import type { Attendance, Member, InsertAttendance } from "@shared/schema";
import { useLanguage } from "@/context/language-context";

import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

export default function AttendancePage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission(PERMISSIONS.ATTENDANCE_CREATE);
  const canDelete = hasPermission(PERMISSIONS.ATTENDANCE_DELETE);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", selectedDate],
  });

  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const attendanceKey = ["/api/attendance", selectedDate];

  const recordAttendance = useMutation({
    mutationFn: async (data: InsertAttendance) => {
      const response = await apiRequest("POST", "/api/attendance", data);
      return response.json();
    },
    onMutate: async (newRecord) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) => [
        ...(old ?? []),
        { ...(newRecord as Attendance), id: `optimistic-${newRecord.memberId}` },
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const bulkRecordAttendance = useMutation({
    mutationFn: async (entries: { memberId: string; memberName: string }[]) => {
      const response = await apiRequest("POST", "/api/attendance/bulk", {
        members: entries,
        date: selectedDate,
        checkIn: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkIn = new Date().toISOString();
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) => [
        ...(old ?? []),
        ...entries.map((entry) => ({
          id: `optimistic-${entry.memberId}`,
          memberId: entry.memberId,
          memberName: entry.memberName,
          date: selectedDate,
          checkIn,
        }) as Attendance),
      ]);
      return { previous };
    },
    onSuccess: (_data, entries) => {
      toast({
        title: t("common.success"),
        description: t("attendance.bulkSuccess").replace("{count}", String(entries.length)),
      });
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const removeAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      await apiRequest("DELETE", `/api/attendance/${attendanceId}`);
      return true;
    },
    onMutate: async (attendanceId) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).filter((record) => record.id !== attendanceId),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.deleteError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const attendanceByMember = new Map<string, Attendance>();
  attendanceRecords?.forEach((record) => attendanceByMember.set(record.memberId, record));

  const getAttendanceRecord = (member: Member) =>
    attendanceByMember.get(member.memberId) ?? attendanceByMember.get(member.id);

  const isMemberActive = (member: Member, date: string) => {
    if (!member.subscriptionStart || !member.subscriptionEnd) return false;
    try {
      const selected = startOfDay(parseISO(date));
      const start = startOfDay(parseISO(member.subscriptionStart));
      const end = endOfDay(parseISO(member.subscriptionEnd));
      return isWithinInterval(selected, { start, end });
    } catch {
      return false;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
  };

  const handleToggleAttendance = (member: Member) => {
    const existingRecord = getAttendanceRecord(member);
    if (existingRecord) {
      // Wait until the optimistic insert is confirmed before allowing un-check.
      if (existingRecord.id.startsWith("optimistic-")) return;
      if (!canDelete) {
        toast({
          title: t("common.error"),
          description: t("common.accessDeniedMessage"),
          variant: "destructive",
        });
        return;
      }
      removeAttendance.mutate(existingRecord.id);
      return;
    }

    if (!canAdd) {
      toast({
        title: t("common.error"),
        description: t("common.accessDeniedMessage"),
        variant: "destructive",
      });
      return;
    }

    recordAttendance.mutate({
      memberId: member.id,
      memberName: member.name,
      date: selectedDate,
      checkIn: new Date().toISOString(),
    });
  };

  const toggleSelect = (member: Member) => {
    if (getAttendanceRecord(member)) return; // already present, nothing to bulk-record
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(member.id)) next.delete(member.id);
      else next.add(member.id);
      return next;
    });
  };

  const handleCardClick = (member: Member) => {
    if (selectMode) {
      toggleSelect(member);
      return;
    }
    if (canAdd || canDelete) handleToggleAttendance(member);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const submitBulk = () => {
    const entries = activeMembers
      .filter((member) => selectedIds.has(member.id))
      .map((member) => ({ memberId: member.id, memberName: member.name }));
    if (entries.length === 0) return;
    bulkRecordAttendance.mutate(entries);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const activeMembers = (members ?? []).filter((member) =>
    isMemberActive(member, selectedDate)
  );

  const presentCount = activeMembers.filter((member) => getAttendanceRecord(member)).length;

  const filteredMembers = activeMembers.filter((member) => {
    const isPresent = Boolean(getAttendanceRecord(member));
    if (statusFilter === "present" && !isPresent) return false;
    if (statusFilter === "absent" && isPresent) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.name.toLowerCase().includes(query) ||
      member.memberId.toLowerCase().includes(query)
    );
  });

  if (loadingAttendance || loadingMembers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {t('attendance.title')}
            </h1>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {presentCount} / {activeMembers.length} {t('common.present')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {canAdd && (
            <Link href="/scan">
              <Button variant="outline" className="w-full sm:w-auto">
                <QrCode className="h-4 w-4 me-2" />
                {t("checkin.scannerTitle")}
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-44"
              data-testid="input-attendance-date"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-attendance"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            {t('common.all')} ({activeMembers.length})
          </Button>
          <Button
            variant={statusFilter === "present" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("present")}
          >
            {t('common.present')} ({presentCount})
          </Button>
          <Button
            variant={statusFilter === "absent" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("absent")}
          >
            {t('common.absent')} ({activeMembers.length - presentCount})
          </Button>
        </div>
        {canAdd && (
          <div className="flex flex-wrap gap-2">
            {selectMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const absentIds = filteredMembers
                      .filter((member) => !getAttendanceRecord(member))
                      .map((member) => member.id);
                    setSelectedIds(new Set(absentIds));
                  }}
                >
                  {t('attendance.selectAllAbsent')}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedIds.size === 0 || bulkRecordAttendance.isPending}
                  onClick={submitBulk}
                >
                  <UserCheck className="h-4 w-4 me-2" />
                  {t('attendance.checkInSelected').replace("{count}", String(selectedIds.size))}
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                <Users className="h-4 w-4 me-2" />
                {t('attendance.bulkMode')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => {
            const record = getAttendanceRecord(member);
            const isPresent = Boolean(record);
            const isSelected = selectMode && selectedIds.has(member.id);
            const cardLabel = isPresent ? t('attendance.checkOut') : t('attendance.checkIn');

            return (
              <Card
                key={member.id}
                className={cn(
                  "transition border hover:shadow-sm",
                  (canAdd || canDelete) ? "cursor-pointer" : "cursor-default opacity-80",
                  isPresent
                    ? "border-green-500/70 bg-green-50/60 dark:bg-green-900/10"
                    : "hover:border-primary/40",
                  selectMode && isPresent && "opacity-50",
                  isSelected && "ring-2 ring-primary border-primary"
                )}
                onClick={() => handleCardClick(member)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(member);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={selectMode ? isSelected : isPresent}
                data-testid={`card-attendance-${member.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.imageUrl ?? undefined} alt={member.name} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-xs text-muted-foreground">#{member.memberId}</p>
                        </div>
                        {isPresent ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {t('common.present')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('common.absent')}</Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {record?.checkIn ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <LogIn className="h-3 w-3" />
                            <span>
                              {t('common.time')}: {safeFormat(record.checkIn, "HH:mm", { fallback: String(record.checkIn) })}
                            </span>
                          </div>
                        ) : null}
                        <p className="text-xs text-muted-foreground">{cardLabel}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            {searchQuery
              ? t('common.noResults')
              : t('members.noMembers')}
          </div>
        )}
      </div>
    </div>
  );
}
