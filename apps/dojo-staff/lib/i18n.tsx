import AsyncStorage from "@react-native-async-storage/async-storage";
import { ar, enUS } from "date-fns/locale";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BrandedSplash } from "./branded-splash";
import { applyNativeLayoutDirection, reloadAppForLayoutDirection } from "./locale-layout";

export type Locale = "en" | "ar";
const LOCALE_KEY = "staff_locale";

const messages = {
  en: {
    "app.name": "Nawady Staff",
    "tabs.today": "Today",
    "tabs.scan": "Scan",
    "tabs.schedule": "Schedule",
    "tabs.members": "Members",
    "tabs.club": "Club",
    "login.brand": "Nawady Staff",
    "login.subtitle": "Scan, schedule, and manage your club on the go",
    "login.email": "Email",
    "login.password": "Password",
    "login.signIn": "Sign in",
    "login.register": "New club? Create a free account",
    "register.title": "Start free",
    "register.subtitle": "Manage members, classes & check-ins — no credit card",
    "register.note": "Free forever for core club management. Upgrade on the web when you need finance, store & analytics.",
    "register.clubName": "Club name",
    "register.yourName": "Your name",
    "register.email": "Email",
    "register.phone": "Phone (optional)",
    "register.password": "Password",
    "register.clubType": "Club type",
    "register.submit": "Create free club",
    "register.signIn": "Already have an account? Sign in",
    "dashboard.title": "Operations hub",
    "dashboard.scan": "Scan",
    "dashboard.members": "Members",
    "dashboard.schedule": "Schedule",
    "dashboard.checkInsToday": "Check-ins today",
    "dashboard.classesToday": "Classes today",
    "dashboard.openScanner": "Open QR scanner",
    "dashboard.recentCheckIns": "Recent check-ins",
    "dashboard.noCheckIns": "No check-ins yet today",
    "dashboard.todaysClasses": "Today's classes",
    "dashboard.noClasses": "No classes scheduled",
    "dashboard.coachNote": "Coach view — your sessions only",
    "scan.title": "Scan member QR",
    "scan.subtitle": "Point at membership code",
    "scan.permissionTitle": "QR Scanner",
    "scan.permissionSub": "Camera permission required",
    "scan.allowCamera": "Allow camera",
    "scan.noSlug": "Set public slug in booking settings",
    "scan.ready": "Ready to scan",
    "scan.checkInOk": "Check-in successful",
    "scan.checkOutOk": "Checked out",
    "schedule.title": "Schedule",
    "schedule.subtitle": "Next 7 days — read-only in app",
    "schedule.webBanner": "Create, edit, and manage recurring classes on the full web dashboard.",
    "schedule.openWeb": "Open web schedule",
    "schedule.noClasses": "No upcoming classes — add them on the web schedule",
    "schedule.coach": "Coach {name}",
    "schedule.booked": "{booked} / {capacity} booked",
    "schedule.manageWeb": "Tap to manage on web",
    "members.title": "Members",
    "members.subtitle": "Search & manual check-in",
    "members.checkIn": "Check in",
    "members.checkInTitle": "Check in member",
    "members.checkInConfirm": "Mark {name} as arrived?",
    "members.checkedIn": "{name} checked in",
    "members.notFound": "No members found",
    "club.title": "My club",
    "club.subtitle": "Profile, packages & team",
    "club.freePlan": "Free",
    "club.planLabel": "{plan} plan",
    "club.limits": "Up to {members} members · {staff} staff",
    "club.menuProfile": "Club profile & logo",
    "club.menuProfileSub": "Name, contact, branding",
    "club.menuPackages": "Member packages",
    "club.menuPackagesSub": "Plans members can buy",
    "club.menuRegistrations": "Class registrations",
    "club.menuRegistrationsSub": "Who booked upcoming classes",
    "club.menuTeam": "Staff team",
    "club.menuTeamSub": "Invite coaches & staff",
    "club.menuWeb": "Full web dashboard",
    "club.menuWebSub": "Finance, store, analytics…",
    "club.signedInAs": "Signed in as",
    "club.email": "Email",
    "club.role": "Role",
    "club.maxBadge": "{count} max",
    "settings.title": "Club profile",
    "settings.subtitle": "Logo & contact info sync to member app",
    "settings.clubName": "Club name",
    "settings.phone": "Phone",
    "settings.location": "Location",
    "settings.welcome": "Welcome message",
    "settings.logoHint": "Logo and brand colors are managed on the web dashboard.",
    "settings.uploadLogo": "Upload logo on web",
    "settings.save": "Save changes",
    "settings.saving": "Saving…",
    "packages.title": "Member packages",
    "packages.subtitle": "Plans members can register for",
    "packages.add": "Add package",
    "packages.name": "Name",
    "packages.price": "Price",
    "packages.days": "Days",
    "packages.submit": "Add package",
    "packages.empty": "No packages yet — add your first plan above.",
    "packages.meta": "{price} · {days} days",
    "registrations.title": "Registrations",
    "registrations.subtitle": "Members booked for upcoming classes",
    "registrations.empty": "No upcoming class registrations.",
    "registrations.member": "Member",
    "registrations.session": "Class session",
    "team.title": "Staff team",
    "team.subtitle": "{count} / {max} users on your plan",
    "team.invite": "Invite staff",
    "team.name": "Name",
    "team.email": "Email",
    "team.tempPassword": "Temporary password",
    "team.submit": "Add staff member",
    "profile.signOut": "Sign out",
    "profile.language": "Language",
    "profile.theme": "Appearance",
    "profile.themeSystem": "System",
    "profile.themeLight": "Light",
    "profile.themeDark": "Dark",
    "upgrade.title": "Run your whole club on the web",
    "upgrade.titleCompact": "Unlock full web dashboard",
    "upgrade.subtitle": "Finance, store, analytics & more — upgrade anytime on Nawady web.",
    "common.search": "Search name or phone…",
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.error": "Check-in failed",
  },
  ar: {
    "app.name": "نوادي — الموظفين",
    "tabs.today": "اليوم",
    "tabs.scan": "مسح",
    "tabs.schedule": "الجدول",
    "tabs.members": "الأعضاء",
    "tabs.club": "النادي",
    "login.brand": "نوادي — الموظفين",
    "login.subtitle": "امسح الرمز، تابع الجدول، وأدر ناديك من أي مكان",
    "login.email": "البريد الإلكتروني",
    "login.password": "كلمة المرور",
    "login.signIn": "دخول",
    "login.register": "نادي جديد؟ أنشئ حساباً مجانياً",
    "register.title": "ابدأ مجاناً",
    "register.subtitle": "أدر الأعضاء والحصص والحضور — بدون بطاقة ائتمان",
    "register.note": "مجاني للأبد لإدارة النادي الأساسية. ترقّ على الويب عند الحاجة للمالية والمتجر والتقارير.",
    "register.clubName": "اسم النادي",
    "register.yourName": "اسمك",
    "register.email": "البريد الإلكتروني",
    "register.phone": "الهاتف (اختياري)",
    "register.password": "كلمة المرور",
    "register.clubType": "نوع النادي",
    "register.submit": "إنشاء نادي مجاني",
    "register.signIn": "لديك حساب؟ سجّل الدخول",
    "dashboard.title": "مركز العمليات",
    "dashboard.scan": "مسح",
    "dashboard.members": "الأعضاء",
    "dashboard.schedule": "الجدول",
    "dashboard.checkInsToday": "حضور اليوم",
    "dashboard.classesToday": "حصص اليوم",
    "dashboard.openScanner": "فتح ماسح QR",
    "dashboard.recentCheckIns": "آخر تسجيلات الحضور",
    "dashboard.noCheckIns": "لا يوجد حضور اليوم بعد",
    "dashboard.todaysClasses": "حصص اليوم",
    "dashboard.noClasses": "لا توجد حصص مجدولة",
    "dashboard.coachNote": "عرض المدرب — حصصك فقط",
    "scan.title": "مسح رمز العضو",
    "scan.subtitle": "وجّه الكاميرا نحو رمز العضوية",
    "scan.permissionTitle": "ماسح QR",
    "scan.permissionSub": "مطلوب إذن الكاميرا",
    "scan.allowCamera": "السماح بالكاميرا",
    "scan.noSlug": "عيّن الرابط العام في إعدادات الحجز",
    "scan.ready": "جاهز للمسح",
    "scan.checkInOk": "تم تسجيل الحضور",
    "scan.checkOutOk": "تم تسجيل المغادرة",
    "schedule.title": "الجدول",
    "schedule.subtitle": "الـ 7 أيام القادمة — للعرض فقط في التطبيق",
    "schedule.webBanner": "أنشئ وعدّل الحصص المتكررة من لوحة الويب الكاملة.",
    "schedule.openWeb": "فتح الجدول على الويب",
    "schedule.noClasses": "لا حصص قادمة — أضفها من جدول الويب",
    "schedule.coach": "المدرب {name}",
    "schedule.booked": "{booked} / {capacity} محجوز",
    "schedule.manageWeb": "اضغط للإدارة على الويب",
    "members.title": "الأعضاء",
    "members.subtitle": "بحث وتسجيل حضور يدوي",
    "members.checkIn": "تسجيل حضور",
    "members.checkInTitle": "تسجيل حضور العضو",
    "members.checkInConfirm": "تسجيل حضور {name}؟",
    "members.checkedIn": "تم تسجيل حضور {name}",
    "members.notFound": "لم يُعثر على أعضاء",
    "club.title": "نادِي",
    "club.subtitle": "الملف، الباقات والفريق",
    "club.freePlan": "مجاني",
    "club.planLabel": "خطة {plan}",
    "club.limits": "حتى {members} عضو · {staff} موظف",
    "club.menuProfile": "ملف النادي والشعار",
    "club.menuProfileSub": "الاسم، التواصل، العلامة",
    "club.menuPackages": "باقات الأعضاء",
    "club.menuPackagesSub": "الباقات المتاحة للشراء",
    "club.menuRegistrations": "تسجيل الحصص",
    "club.menuRegistrationsSub": "من حجز الحصص القادمة",
    "club.menuTeam": "فريق الموظفين",
    "club.menuTeamSub": "دعوة المدربين والموظفين",
    "club.menuWeb": "لوحة الويب الكاملة",
    "club.menuWebSub": "المالية، المتجر، التقارير…",
    "club.signedInAs": "مسجّل الدخول كـ",
    "club.email": "البريد",
    "club.role": "الدور",
    "club.maxBadge": "حد {count}",
    "settings.title": "ملف النادي",
    "settings.subtitle": "الشعار وبيانات التواصل تظهر في تطبيق الأعضاء",
    "settings.clubName": "اسم النادي",
    "settings.phone": "الهاتف",
    "settings.location": "الموقع",
    "settings.welcome": "رسالة الترحيب",
    "settings.logoHint": "الشعار وألوان العلامة تُدار من لوحة الويب.",
    "settings.uploadLogo": "رفع الشعار على الويب",
    "settings.save": "حفظ التغييرات",
    "settings.saving": "جاري الحفظ…",
    "packages.title": "باقات الأعضاء",
    "packages.subtitle": "الباقات التي يمكن للأعضاء الاشتراك بها",
    "packages.add": "إضافة باقة",
    "packages.name": "الاسم",
    "packages.price": "السعر",
    "packages.days": "الأيام",
    "packages.submit": "إضافة باقة",
    "packages.empty": "لا توجد باقات بعد — أضف أول باقة أعلاه.",
    "packages.meta": "{price} · {days} يوم",
    "registrations.title": "التسجيلات",
    "registrations.subtitle": "أعضاء محجوزون للحصص القادمة",
    "registrations.empty": "لا تسجيلات قادمة للحصص.",
    "registrations.member": "عضو",
    "registrations.session": "حصة",
    "team.title": "فريق الموظفين",
    "team.subtitle": "{count} / {max} مستخدم على خطتك",
    "team.invite": "دعوة موظف",
    "team.name": "الاسم",
    "team.email": "البريد",
    "team.tempPassword": "كلمة مرور مؤقتة",
    "team.submit": "إضافة موظف",
    "profile.signOut": "تسجيل الخروج",
    "profile.language": "اللغة",
    "profile.theme": "المظهر",
    "profile.themeSystem": "تلقائي",
    "profile.themeLight": "فاتح",
    "profile.themeDark": "داكن",
    "upgrade.title": "أدر ناديك بالكامل على الويب",
    "upgrade.titleCompact": "افتح لوحة الويب الكاملة",
    "upgrade.subtitle": "المالية، المتجر، التقارير والمزيد — ترقّ في أي وقت على نوادي.",
    "common.search": "ابحث بالاسم أو الهاتف…",
    "common.loading": "جاري التحميل…",
    "common.cancel": "إلغاء",
    "common.today": "اليوم",
    "common.tomorrow": "غداً",
    "common.error": "فشل تسجيل الحضور",
  },
} as const;

type Key = keyof typeof messages.en;

const Ctx = createContext<{
  locale: Locale;
  isRtl: boolean;
  t: (k: Key, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => Promise<void>;
  clubTypeName: (nameEn: string, nameAr?: string | null) => string;
  dateLocale: typeof enUS;
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(LOCALE_KEY);
      const l = saved === "ar" ? "ar" : "en";
      applyNativeLayoutDirection(l);
      setLocaleState(l);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    await AsyncStorage.setItem(LOCALE_KEY, l);
    if (applyNativeLayoutDirection(l)) {
      await reloadAppForLayoutDirection();
      return;
    }
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (k: Key, vars?: Record<string, string | number>) => {
      let s: string = messages[locale][k] ?? messages.en[k];
      if (vars) {
        for (const [key, val] of Object.entries(vars)) {
          s = s.replace(`{${key}}`, String(val));
        }
      }
      return s;
    },
    [locale],
  );

  const clubTypeName = useCallback(
    (nameEn: string, nameAr?: string | null) => (locale === "ar" && nameAr ? nameAr : nameEn),
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      isRtl: locale === "ar",
      t,
      setLocale,
      clubTypeName,
      dateLocale: locale === "ar" ? ar : enUS,
    }),
    [locale, t, setLocale, clubTypeName],
  );

  if (!ready) return <BrandedSplash />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n required");
  return ctx;
}
