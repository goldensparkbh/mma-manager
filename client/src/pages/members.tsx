import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Plus, Search, Trash2, UserPlus, Award, Printer, X, Pencil, Download, FileText, LayoutGrid, LayoutList, CreditCard, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { getAllAttendance, getSubscriptionsByMember } from "@/lib/firebaseData";
import type { Member, InsertMember, Belt, MemberBelt, InsertMemberBelt, Attendance, Subscription, SubscriptionPackage } from "@shared/schema";
import { MemberDetailsDialog } from "@/components/member-details-dialog";
import { WhatsAppTemplateDialog } from "@/components/whatsapp-template-dialog";

import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function Members() {
  const { role, clubSettings } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = role === "admin";
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsMember, setDetailsMember] = useState<Member | null>(null);
  const [whatsAppMember, setWhatsAppMember] = useState<Member | null>(null);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  /* Selection State */
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const whatsappTemplates = clubSettings?.whatsappTemplates ?? [];

  // Queries
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: belts } = useQuery<Belt[]>({
    queryKey: ["/api/belts"],
  });

  const { data: memberBelts } = useQuery<MemberBelt[]>({
    queryKey: ["/api/member-belts"],
  });

  const { data: allAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance/all"],
    queryFn: getAllAttendance,
    enabled: selectedMembers.size > 0
  });

  // Mutations
  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: t("common.success"), description: t("members.deleteSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t("common.error"), description: t("members.deleteError") });
    }
  });

  const deleteSelectedMembers = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/members/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedMembers(new Set());
      toast({ title: t('common.success'), description: t("members.bulkDeleteSuccess") });
    },
    onError: () => {
      toast({ variant: "destructive", title: t('common.error'), description: t("members.bulkDeleteError") });
    }
  });




  // Export Logic
  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredMembers?.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredMembers?.map(m => m.id) ?? []));
    }
  };

  const toggleSelectMember = (id: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMembers(newSelected);
  };

  const handleExport = async () => {
    if (selectedMembers.size === 0) return;

    // Ensure we have attendance data. If useQuery hasn't finished, wait (or refetch).
    // Simple way: call getAllAttendance directly if missing, or trust useQuery if enabled.
    // For safety, let's fetch if missing.
    let attendanceData = allAttendance;
    if (!attendanceData) {
      attendanceData = await getAllAttendance();
    }

    const membersToExport = members?.filter(m => selectedMembers.has(m.id)) ?? [];

    // CSV Header
    const headers = [
      t("members.exportHeaders.name"),
      t("members.exportHeaders.memberId"),
      t("members.exportHeaders.phone"),
      t("members.exportHeaders.email"),
      t("members.exportHeaders.dob"),
      t("members.exportHeaders.gender"),
      t("members.exportHeaders.weight"),
      t("members.exportHeaders.height"),
      t("members.exportHeaders.bloodType"),
      t("members.exportHeaders.beltSize"),
      t("members.exportHeaders.suitSize"),
      t("members.exportHeaders.status"),
      t("members.exportHeaders.subscriptionEnd"),
      t("members.exportHeaders.latestBelt"),
      t("members.exportHeaders.latestBeltDate"),
      t("members.exportHeaders.attendanceCurrentSub"),
      t("members.exportHeaders.attendanceSinceLastBelt"),
    ];

    const rows = membersToExport.map(m => {
      // Attendance Specs
      const memberAttendance = attendanceData?.filter(a => a.memberId === m.memberId || a.memberId === m.id) || [];

      // 1. Current Subscription
      let subAttendance = 0;
      if (m.subscriptionStart) {
        subAttendance = memberAttendance.filter(a => a.date >= m.subscriptionStart!).length;
      }

      // 2. Since Last Belt
      let beltAttendance = 0;
      const myBelts = memberBelts?.filter(mb => mb.memberId === m.id) || [];
      // Sort DESC
      myBelts.sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
      const lastBelt = myBelts[0];
      if (lastBelt) {
        beltAttendance = memberAttendance.filter(a => a.date >= lastBelt.awardedAt).length;
      } else {
        beltAttendance = memberAttendance.length; // Default to all time if no belt? Or 0? "Since last belt" usually implies "Since the beginning" if no belt.
      }

      const lastBeltName = lastBelt ? belts?.find(b => b.id === lastBelt.beltId)?.name : t("common.none");
      const lastBeltDate = lastBelt ? new Date(lastBelt.awardedAt).toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-US') : t("common.none");

      return [
        `"${m.name}"`,
        `"${m.memberId}"`,
        `"${m.phone}"`,
        `"${m.email || ''}"`,
        `"${m.dob || ''}"`,
        `"${m.gender === 'male' ? t('members.male') : m.gender === 'female' ? t('members.female') : ''}"`,
        `"${m.weight || ''}"`,
        `"${m.height || ''}"`,
        `"${m.bloodType || ''}"`,
        `"${m.beltSize || ''}"`,
        `"${m.suitSize || ''}"`,
        `"${m.status === 'active' ? t('common.active') : t('common.expired')}"`,
        `"${m.subscriptionEnd || ''}"`,
        `"${lastBeltName}"`,
        `"${lastBeltDate}"`,
        `"${subAttendance}"`,
        `"${beltAttendance}"`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `members_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Helper
  const getMemberBeltsBadges = (memberId: string) => {
    const earned = memberBelts?.filter(mb => mb.memberId === memberId) || [];
    const badges = earned.map(mb => {
      const belt = belts?.find(b => b.id === mb.beltId);
      if (!belt) return null;
      return { ...belt, memberBeltId: mb.id };
    }).filter(Boolean) as (Belt & { memberBeltId: string })[];

    badges.sort((a, b) => (a.order || 0) - (b.order || 0));
    return badges;
  };

  const filteredMembers = members?.filter(
    (member) => {
      const matchesSearch = member.name.includes(searchQuery) ||
        member.memberId.includes(searchQuery) ||
        member.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      // Status Filters
      if (activeTab === "all") return true;
      if (activeTab === "active") return member.status === "active";
      if (activeTab === "expired") return member.status === "expired" || (member.subscriptionEnd && new Date(member.subscriptionEnd) < new Date());
      if (activeTab === "soon") {
        if (!member.subscriptionEnd) return false;
        const end = new Date(member.subscriptionEnd);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7; // Expiring in next 7 days
      }
      return true;
    }
  );

  const getStatusBadge = (member: Member) => {
    if (!member.subscriptionEnd) {
      switch (member.status) {
        case "active": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/10 dark:text-green-300">{t('common.active')}</Badge>;
        case "expired": return <Badge variant="destructive">{t('common.expired')}</Badge>;
        default: return <Badge variant="secondary">{member.status}</Badge>;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(member.subscriptionEnd);
    if (isNaN(end.getTime())) {
      return <Badge variant="secondary">{t('members.invalidDate')}</Badge>;
    }
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">{t('common.expired')}</Badge>;
    } else if (diffDays <= 10) {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{t('common.aboutToExpire')}</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/10 dark:text-green-300">{t('common.active')}</Badge>;
    }
  };

  const handlePrintCard = (member: Member) => {
    setCardMember(member);
  };
  const openWhatsAppDialog = (member: Member) => {
    setWhatsAppMember(member);
    setIsWhatsAppDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Card><CardContent className="p-6"><Skeleton className="h-12 w-full mb-2" /></CardContent></Card>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{t('members.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('members.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("members.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
              data-testid="input-search-members"
            />
          </div>
          <div className="flex gap-2">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                <TabsTrigger value="active">{t('common.active')}</TabsTrigger>
                <TabsTrigger value="inactive">{t('common.inactive')}</TabsTrigger>
                <TabsTrigger value="soon">{t('members.expiringSoon')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex gap-2">
            {selectedMembers.size > 0 && (
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                {t("common.export")} ({selectedMembers.size})
              </Button>
            )}
            {selectedMembers.size > 0 && isAdmin && (
              <Button
                variant="destructive"
                className="gap-2"
                disabled={deleteSelectedMembers.isPending}
                onClick={() => {
                  if (confirm(t('common.deleteConfirm'))) {
                    deleteSelectedMembers.mutate(Array.from(selectedMembers));
                  }
                }}
              >
                {deleteSelectedMembers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t('common.delete')} ({selectedMembers.size})
              </Button>
            )}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("list")}
                title={t("members.listView")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2"
                onClick={() => setViewMode("grid")}
                title={t("members.gridView")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => { setDetailsMember(null); setIsDetailsDialogOpen(true); }} data-testid="button-add-member">
              <UserPlus className="h-4 w-4 ml-2" />
              {t('members.addMember')}
            </Button>
          </div>
        </div>


      </div >

      {viewMode === "list" ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("members.listTitle")}</CardTitle>
            {/* Search Input handled above */}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 w-[40px]">
                      <Checkbox
                        checked={filteredMembers?.length! > 0 && selectedMembers.size === filteredMembers?.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.name')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.memberId')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.phone')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.belt')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.status')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('members.balance')}</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers && filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => {
                      const isExpired = member.subscriptionEnd ? new Date(member.subscriptionEnd) < new Date() : false;
                      const status = isExpired ? "expired" : member.status;

                      return (
                        <tr
                          key={member.id}
                          className="border-b last:border-0 hover:bg-muted/50 transition-colors group cursor-pointer"
                          onClick={(e) => {
                            // Don't trigger if checkbox or action buttons are clicked
                            if ((e.target as HTMLElement).closest('.no-click-propagation')) return;
                            setDetailsMember(member);
                            setIsDetailsDialogOpen(true);
                          }}
                        >
                          <td className="py-3 px-4 no-click-propagation">
                            <Checkbox
                              checked={selectedMembers.has(member.id)}
                              onCheckedChange={() => toggleSelectMember(member.id)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.imageUrl || undefined} className="object-contain" />
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                              </Avatar>
                              <span>{member.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">#{member.memberId}</td>
                          <td className="py-3 px-3 text-right no-click-propagation">
                            <button
                              type="button"
                              className="font-mono text-primary hover:underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                openWhatsAppDialog(member);
                              }}
                            >
                              <span dir="ltr">{member.phone}</span>
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex -space-x-1">
                              {getMemberBeltsBadges(member.id).map(b => (
                                <div key={b.memberBeltId} className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: b.color }} title={b.name} />
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">{getStatusBadge(member)}</td>
                          <td className="py-3 px-3 text-right font-mono">{member.balance || 0} {t("common.currency")}</td>
                          <td className="py-3 px-3 flex items-center gap-2 text-right no-click-propagation">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handlePrintCard(member)} title={t("members.membershipCard")}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => { setDetailsMember(member); setIsDetailsDialogOpen(true); }}
                              title={t("common.edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(t('common.deleteConfirm'))) deleteMember.mutate(member.id);
                                }}
                                title={t("common.delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (<tr><td colSpan={8} className="text-center py-8">{t("common.noResults")}</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMembers && filteredMembers.length > 0 ? (
            filteredMembers.map((member) => {
              const isExpired = member.subscriptionEnd ? new Date(member.subscriptionEnd) < new Date() : false;

              return (
                <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow relative group">
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedMembers.has(member.id)}
                      onCheckedChange={() => toggleSelectMember(member.id)}
                    />
                  </div>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-muted">
                        <AvatarImage src={member.imageUrl || undefined} className="object-contain" />
                        <AvatarFallback className="text-2xl">{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        {getStatusBadge(member)}
                      </div>
                    </div>

                    <div className="w-full">
                      <h3 className="font-bold text-lg truncate" title={member.name}>{member.name}</h3>
                      <p className="text-xs font-mono text-muted-foreground">{t("common.id")}: {member.memberId}</p>
                    </div>

                    <div className="flex -space-x-2 py-1 justify-center w-full">
                      {getMemberBeltsBadges(member.id).length > 0 ? getMemberBeltsBadges(member.id).map(b => (
                        <div key={b.memberBeltId} className="w-6 h-6 rounded-full border-2 border-background" style={{ backgroundColor: b.color }} title={b.name} />
                      )) : <div className="h-6"></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                      <div className="text-right">
                        <span className="block opacity-70">{t("members.phone")}</span>
                        <button
                          type="button"
                          className="font-mono text-primary hover:underline"
                          onClick={() => openWhatsAppDialog(member)}
                        >
                          <span dir="ltr">{member.phone}</span>
                        </button>
                      </div>
                      <div className="text-left">
                        <span className="block opacity-70">{t("subscriptions.endDate")}</span>
                        <span>{member.subscriptionEnd || "-"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handlePrintCard(member)}>
                        <Printer className="h-3 w-3 ml-1" /> {t("members.membershipCard")}
                      </Button>
                      <Button size="sm" variant="ghost" className="px-2" onClick={() => { setDetailsMember(member); setIsDetailsDialogOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t("common.noResults")}
            </div>
          )}
        </div>
      )
      }

      {/* Membership Card Dialog */}
      <Dialog open={!!cardMember} onOpenChange={(open) => !open && setCardMember(null)}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          {/* NO HEADER to keep clean */}
          {cardMember && (
            <div className="w-full flex flex-col items-center gap-4">
              <div id="membership-card" className="w-[300px] h-[450px] bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col items-center p-6 border border-neutral-700 select-none">
                {/* Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

                {/* Logo / Brand */}
                <div className="mt-8 mb-4 flex flex-col items-center">
                  <img src={clubSettings?.logoUrlDark || clubSettings?.logoUrlLight || "/logo_dark_icon.svg"} alt={t("members.logoAlt")} className="w-20 h-20 object-contain opacity-90 mb-2" />
                  <h2 className="text-xl font-black tracking-widest uppercase text-center leading-tight">
                    {clubSettings?.name || t("members.clubFallback")}
                  </h2>
                </div>

                {/* Avatar */}
                <div className="w-24 h-24 shrink-0 aspect-square rounded-full border-4 border-neutral-800 shadow-xl overflow-hidden mb-6 bg-neutral-700">
                  {cardMember.imageUrl ?
                    <img src={cardMember.imageUrl} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-500">{cardMember.name[0]}</div>
                  }
                </div>

                {/* Details */}
                <div className="text-center w-full">
                  <h1 className="text-xl font-bold mb-1 truncate px-2">{cardMember.name}</h1>
                  <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-mono mb-4 text-neutral-300">
                    {t("common.id")}: {cardMember.memberId}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto w-full pt-4 pb-2 border-t border-white/10 flex justify-between items-end">
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">{t("members.memberSince")}</p>
                    <p className="text-xs font-mono">{new Date().getFullYear()}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    {/* QR Code Placeholder removed */}
                  </div>
                </div>

                {/* Decorative overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>

              <div className="flex gap-2 w-full max-w-[300px]">
                <Button className="flex-1" onClick={() => {
                  const content = document.getElementById('membership-card')?.outerHTML;
                  const printWindow = window.open('', '', 'height=600,width=800');
                  if (printWindow && content) {
                    printWindow.document.write(`<html><head><title>${t("members.membershipCard")}</title>`);
                    printWindow.document.write('<style>body{margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#f0f0f0;} #membership-card { transform: scale(1); box-shadow: none !important; margin: 20px; } @media print { body { background: none; } #membership-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>');
                    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                    printWindow.document.write('</head><body>');
                    printWindow.document.write(content);
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    setTimeout(() => {
                      printWindow.print();
                    }, 1000);
                  }
                }}>
                  <Printer className="w-4 h-4 ml-2" /> {t("common.print")}
                </Button>
                <Button variant="outline" onClick={() => setCardMember(null)}>{t("common.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <WhatsAppTemplateDialog
        member={whatsAppMember}
        open={isWhatsAppDialogOpen}
        onOpenChange={(open) => {
          setIsWhatsAppDialogOpen(open);
          if (!open) {
            setWhatsAppMember(null);
          }
        }}
        templates={whatsappTemplates}
      />

      <MemberDetailsDialog
        member={detailsMember}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
      />
    </div>

  );
}
