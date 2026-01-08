import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, LogIn, LogOut, Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Attendance, Member, InsertAttendance } from "@shared/schema";

export default function AttendancePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [formData, setFormData] = useState<Partial<InsertAttendance>>({
    memberId: "",
    memberName: "",
    date: selectedDate,
    checkIn: "",
    checkOut: "",
    notes: "",
  });

  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", selectedDate],
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const recordAttendance = useMutation({
    mutationFn: async (data: InsertAttendance) => {
      const response = await apiRequest("POST", "/api/attendance", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setFormData({
        memberId: "",
        memberName: "",
        date: selectedDate,
        checkIn: "",
        checkOut: "",
        notes: "",
      });
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الحضور بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تسجيل الحضور",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.memberId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار العضو",
        variant: "destructive",
      });
      return;
    }
    recordAttendance.mutate({
      ...formData,
      date: selectedDate,
    } as InsertAttendance);
  };

  const handleMemberChange = (memberId: string) => {
    const member = members?.find((m) => m.id === memberId);
    setFormData({
      ...formData,
      memberId,
      memberName: member?.name ?? "",
    });
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const filteredRecords = attendanceRecords?.filter(
    (record) =>
      record.memberName.includes(searchQuery) || record.memberId.includes(searchQuery)
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ar-BH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  if (loadingAttendance) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">الحضور والانصراف</h1>
          <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
            data-testid="input-attendance-date"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              تسجيل حضور / انصراف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اختر العضو</Label>
                <Select value={formData.memberId} onValueChange={handleMemberChange}>
                  <SelectTrigger data-testid="select-member">
                    <SelectValue placeholder="اختر العضو..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} (#{member.memberId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>وقت الحضور</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={formData.checkIn}
                      onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                      data-testid="input-check-in"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, checkIn: getCurrentTime() })}
                    >
                      <LogIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>وقت الانصراف</Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={formData.checkOut}
                      onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                      data-testid="input-check-out"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, checkOut: getCurrentTime() })}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                  value={formData.notes ?? ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="input-attendance-notes"
                />
              </div>

              <Button type="submit" className="w-full" disabled={recordAttendance.isPending} data-testid="button-submit-attendance">
                {recordAttendance.isPending ? "جاري التسجيل..." : "تسجيل"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base">سجل الحضور اليوم</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-attendance"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">العضو</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">رقم العضوية</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحضور</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">الانصراف</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">الحالة</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords && filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b last:border-0 hover-elevate" data-testid={`row-attendance-${record.id}`}>
                        <td className="py-3 px-3 font-medium">{record.memberName}</td>
                        <td className="py-3 px-3 text-muted-foreground">#{record.memberId}</td>
                        <td className="py-3 px-3">
                          {record.checkIn ? (
                            <Badge variant="secondary" className="gap-1">
                              <LogIn className="h-3 w-3" />
                              {record.checkIn}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {record.checkOut ? (
                            <Badge variant="secondary" className="gap-1">
                              <LogOut className="h-3 w-3" />
                              {record.checkOut}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {record.checkIn && record.checkOut ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              مكتمل
                            </Badge>
                          ) : record.checkIn ? (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              حاضر
                            </Badge>
                          ) : (
                            <Badge variant="secondary">-</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground max-w-[200px] truncate">
                          {record.notes || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        {searchQuery ? "لا توجد نتائج للبحث" : "لا يوجد سجلات حضور لهذا اليوم"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
