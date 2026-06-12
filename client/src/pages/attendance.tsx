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
import { Calendar, LogIn, LogOut, QrCode, Search, Trash2, UserCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeFormat } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import type { Attendance, Member, InsertAttendance } from "@shared/schema";
import { useLanguage } from "@/context/language-context";

import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

type MemberStatus = "in" | "out" | "absent";

export default function AttendancePage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission(PERMISSIONS.ATTENDANCE_CREATE);
  const canDelete = hasPermission(PERMISSIONS.ATTENDANCE_DELETE);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
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

  const checkOutAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      const response = await apiRequest("PATCH", `/api/attendance/${attendanceId}/checkout`, {
        checkOut: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (attendanceId) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkOut = new Date().toISOString();
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).map((record) =>
          record.id === attendanceId ? { ...record, checkOut } : record,
        ),
      );
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

  const bulkCheckOutAttendance = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const response = await apiRequest("POST", "/api/attendance/bulk-checkout", {
        memberIds,
        date: selectedDate,
        checkOut: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (memberIds) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkOut = new Date().toISOString();
      const ids = new Set(memberIds);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).map((record) =>
          ids.has(record.memberId) && !record.checkOut ? { ...record, checkOut } : record,
        ),
      );
      return { previous };
    },
    onSuccess: (_data, memberIds) => {
      toast({
        title: t("common.success"),
        description: t("attendance.bulkCheckOutSuccess").replace("{count}", String(memberIds.length)),
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

  // Members can have several check-in/check-out sessions per day.
  const sessionsByMember = new Map<string, Attendance[]>();
  attendanceRecords?.forEach((record) => {
    const list = sessionsByMember.get(record.memberId) ?? [];
    list.push(record);
    sessionsByMember.set(record.memberId, list);
  });
  sessionsByMember.forEach((list) =>
    list.sort((a, b) => String(b.checkIn ?? "").localeCompare(String(a.checkIn ?? ""))),
  );

  const getMemberSessions = (member: Member): Attendance[] =>
    sessionsByMember.get(member.id) ?? sessionsByMember.get(member.memberId) ?? [];

  const getMemberStatus = (member: Member): MemberStatus => {
    const sessions = getMemberSessions(member);
    if (sessions.length === 0) return "absent";
    return sessions[0].checkOut ? "out" : "in";
  };

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

  const denyAccess = () =>
    toast({
      title: t("common.error"),
      description: t("common.accessDeniedMessage"),
      variant: "destructive",
    });

  const handleToggleAttendance = (member: Member) => {
    const status = getMemberStatus(member);

    if (status === "in") {
      // Open session → record the check-out time.
      const open = getMemberSessions(member)[0];
      if (open.id.startsWith("optimistic-")) return;
      if (!canAdd) return denyAccess();
      checkOutAttendance.mutate(open.id);
      return;
    }

    // Absent or already checked out → start a new check-in session.
    if (!canAdd) return denyAccess();
    recordAttendance.mutate({
      memberId: member.id,
      memberName: member.name,
      date: selectedDate,
      checkIn: new Date().toISOString(),
    });
  };

  const handleDeleteSession = (record: Attendance) => {
    if (record.id.startsWith("optimistic-")) return;
    if (!canDelete) return denyAccess();
    removeAttendance.mutate(record.id);
  };

  const toggleSelect = (member: Member) => {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (value: unknown) =>
    value ? safeFormat(value, "HH:mm", { fallback: String(value) }) : "—";

  const activeMembers = (members ?? []).filter((member) =>
    isMemberActive(member, selectedDate)
  );

  const inCount = activeMembers.filter((m) => getMemberStatus(m) === "in").length;
  const outCount = activeMembers.filter((m) => getMemberStatus(m) === "out").length;
  const absentCount = activeMembers.length - inCount - outCount;

  const filteredMembers = activeMembers.filter((member) => {
    if (statusFilter !== "all" && getMemberStatus(member) !== statusFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.name.toLowerCase().includes(query) ||
      member.memberId.toLowerCase().includes(query)
    );
  });

  // Check-in applies to selected members who are not currently in;
  // check-out applies to selected members with an open session.
  const selectedMembers = activeMembers.filter((member) => selectedIds.has(member.id));
  const selectedForCheckIn = selectedMembers.filter((member) => getMemberStatus(member) !== "in");
  const selectedForCheckOut = selectedMembers.filter((member) => getMemberStatus(member) === "in");

  const submitBulkCheckIn = () => {
    const entries = selectedForCheckIn.map((member) => ({
      memberId: member.id,
      memberName: member.name,
    }));
    if (entries.length === 0) return;
    bulkRecordAttendance.mutate(entries);
  };

  const submitBulkCheckOut = () => {
    const memberIds = selectedForCheckOut.map((member) => member.id);
    if (memberIds.length === 0) return;
    bulkCheckOutAttendance.mutate(memberIds);
  };

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
              {inCount} / {activeMembers.length} {t('common.present')}
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
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            {t('common.all')} ({activeMembers.length})
          </Button>
          <Button
            variant={statusFilter === "in" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in")}
          >
            {t('common.present')} ({inCount})
          </Button>
          <Button
            variant={statusFilter === "out" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("out")}
          >
            {t('attendance.checkedOut')} ({outCount})
          </Button>
          <Button
            variant={statusFilter === "absent" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("absent")}
          >
            {t('common.absent')} ({absentCount})
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
                      .filter((member) => getMemberStatus(member) === "absent")
                      .map((member) => member.id);
                    setSelectedIds(new Set(absentIds));
                  }}
                >
                  {t('attendance.selectAllAbsent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const presentIds = filteredMembers
                      .filter((member) => getMemberStatus(member) === "in")
                      .map((member) => member.id);
                    setSelectedIds(new Set(presentIds));
                  }}
                >
                  {t('attendance.selectAllPresent')}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedForCheckIn.length === 0 || bulkRecordAttendance.isPending}
                  onClick={submitBulkCheckIn}
                >
                  <UserCheck className="h-4 w-4 me-2" />
                  {t('attendance.checkInSelected').replace("{count}", String(selectedForCheckIn.length))}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selectedForCheckOut.length === 0 || bulkCheckOutAttendance.isPending}
                  onClick={submitBulkCheckOut}
                >
                  <LogOut className="h-4 w-4 me-2" />
                  {t('attendance.checkOutSelected').replace("{count}", String(selectedForCheckOut.length))}
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
            const sessions = getMemberSessions(member);
            const status = getMemberStatus(member);
            const isSelected = selectMode && selectedIds.has(member.id);
            const cardLabel = status === "in" ? t('attendance.checkOut') : t('attendance.checkIn');

            return (
              <Card
                key={member.id}
                className={cn(
                  "transition border hover:shadow-sm",
                  (canAdd || canDelete) ? "cursor-pointer" : "cursor-default opacity-80",
                  status === "in" && "border-green-500/70 bg-green-50/60 dark:bg-green-900/10",
                  status === "out" && "border-amber-500/60 bg-amber-50/40 dark:bg-amber-900/10",
                  status === "absent" && "hover:border-primary/40",
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
                aria-pressed={selectMode ? isSelected : status === "in"}
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
                        {status === "in" && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {t('common.present')}
                          </Badge>
                        )}
                        {status === "out" && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            {t('attendance.checkedOut')}
                          </Badge>
                        )}
                        {status === "absent" && (
                          <Badge variant="secondary">{t('common.absent')}</Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="flex items-center gap-1">
                              <LogIn className="h-3 w-3 text-green-600" />
                              {formatTime(session.checkIn)}
                            </span>
                            <span className="flex items-center gap-1">
                              <LogOut className="h-3 w-3 text-amber-600" />
                              {formatTime(session.checkOut)}
                            </span>
                            {canDelete && !selectMode && (
                              <button
                                type="button"
                                className="ms-auto p-0.5 text-muted-foreground/60 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSession(session);
                                }}
                                aria-label={t('common.delete')}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
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
