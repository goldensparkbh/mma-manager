import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager } from "react-native";

export type Locale = "en" | "ar";

const LOCALE_KEY = "app_locale";

const messages = {
  en: {
    "app.name": "Nawady",
    "platform.brand": "Nawady",
    "tabs.explore": "Explore",
    "tabs.clubs": "Clubs",
    "tabs.schedule": "Classes",
    "tabs.account": "My",
    "tabs.home": "Home",
    "tabs.classes": "Classes",
    "tabs.bookings": "Bookings",
    "tabs.pay": "Pay",
    "tabs.profile": "Profile",
    "explore.title": "Find your club",
    "explore.subtitle": "Browse clubs, explore schedules, and join when you're ready",
    "explore.clubs": "Clubs",
    "explore.classes14d": "Classes (14d)",
    "explore.sports": "Sports",
    "explore.browseSport": "Browse by sport",
    "explore.seeAll": "See all",
    "explore.featured": "Featured clubs",
    "explore.allClubs": "All clubs",
    "explore.upcoming": "Upcoming classes",
    "explore.fullSchedule": "Full schedule",
    "explore.noClubs": "No clubs yet",
    "explore.noClubsSub": "Clubs with member portals will appear here",
    "explore.noClasses": "No classes scheduled",
    "explore.noClassesSub": "Check back soon for new sessions",
    "clubs.title": "All clubs",
    "clubs.subtitle": "{count} clubs on Nawady",
    "clubs.search": "Search clubs, city, or code…",
    "clubs.all": "All",
    "clubs.notFound": "No clubs found",
    "clubs.notFoundSub": "Try a different search or sport filter",
    "schedule.title": "Class schedule",
    "schedule.subtitle": "Upcoming sessions across all clubs",
    "schedule.search": "Search class, coach, or club…",
    "account.title": "My account",
    "account.subtitle": "Manage membership and saved clubs",
    "account.signedIn": "Signed in",
    "account.member": "Member",
    "account.club": "Club",
    "account.openClub": "Open my club",
    "account.signOut": "Sign out",
    "account.switchClub": "Switch club",
    "account.notSignedIn": "Not signed in to a club",
    "account.notSignedInSub": "Browse clubs, open a profile, and sign in when you want to book or pay.",
    "account.browseClubs": "Browse clubs",
    "account.recent": "Recently viewed",
    "account.recentEmpty": "Clubs you open will appear here for quick access.",
    "account.favorites": "Saved clubs",
    "login.title": "Member login",
    "login.subtitle": "Sign in to book classes and check in",
    "login.otp": "OTP",
    "login.password": "Password",
    "login.phone": "Phone",
    "login.sendCode": "Send code",
    "login.verify": "Verify",
    "login.signIn": "Sign in",
    "login.browseOther": "Browse other clubs",
    "club.classes": "Classes",
    "club.plans": "Plans",
    "club.events": "Events",
    "club.members": "Members",
    "club.signIn": "Sign in to book & pay",
    "club.dashboard": "Go to my dashboard",
    "club.upcoming": "Upcoming classes",
    "club.membership": "Membership plans",
    "club.contactClub": "Contact the club for membership options.",
    "club.camps": "Events & camps",
    "club.noEvents": "No public events right now.",
    "club.contact": "Contact",
    "club.phone": "Phone",
    "club.location": "Location",
    "club.notFound": "Club not found",
    "club.notFoundSub": "This club may not be listed or the link is incorrect.",
    "club.publicEvent": "Public event",
    "club.signInPurchase": "Sign in to purchase",
    "error.title": "Something went wrong",
    "error.retry": "Try again",
    "error.offline": "Check your connection and try again",
    "payment.verifying": "Verifying payment",
    "payment.success": "Payment successful",
    "payment.failed": "Payment failed",
    "payment.back": "Back to payments",
    "payment.missingId": "Missing payment reference",
    "onboarding.welcome": "Welcome to Nawady",
    "member.browsePlatform": "Explore other clubs on Nawady →",
    "onboarding.subtitle": "Discover clubs, book classes, and manage your membership in one app.",
    "onboarding.browse": "Browse clubs",
    "onboarding.signIn": "I have a club account",
    "onboarding.skip": "Skip",
    "notifications.title": "Notifications",
    "notifications.empty": "No notifications yet",
    "notifications.emptySub": "Booking updates and club announcements will appear here.",
    "class.detail": "Class details",
    "class.book": "Book class",
    "class.booked": "Booked",
    "class.waitlist": "Join waitlist",
    "class.full": "Full",
    "class.coach": "Coach",
    "class.location": "Location",
    "class.spots": "Spots",
    "progression.title": "Belt progression",
    "progression.empty": "No belt awards yet",
    "attendance.title": "Attendance history",
    "attendance.empty": "No check-ins recorded yet",
    "settings.language": "Language",
    "settings.theme": "Appearance",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.system": "System",
    "common.loading": "Loading…",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.remove": "Remove",
  },
  ar: {
    "app.name": "نوادي",
    "platform.brand": "نوادي",
    "tabs.explore": "استكشف",
    "tabs.clubs": "الأندية",
    "tabs.schedule": "الحصص",
    "tabs.account": "حسابي",
    "tabs.home": "الرئيسية",
    "tabs.classes": "الحصص",
    "tabs.bookings": "الحجوزات",
    "tabs.pay": "الدفع",
    "tabs.profile": "الملف",
    "explore.title": "اعثر على ناديك",
    "explore.subtitle": "تصفح الأندية والجداول وانضم عندما تكون جاهزاً",
    "explore.clubs": "أندية",
    "explore.classes14d": "حصص (١٤ يوم)",
    "explore.sports": "رياضات",
    "explore.browseSport": "تصفح حسب الرياضة",
    "explore.seeAll": "عرض الكل",
    "explore.featured": "أندية مميزة",
    "explore.allClubs": "كل الأندية",
    "explore.upcoming": "الحصص القادمة",
    "explore.fullSchedule": "الجدول الكامل",
    "explore.noClubs": "لا توجد أندية بعد",
    "explore.noClubsSub": "ستظهر الأندية التي تفعّل بوابة الأعضاء هنا",
    "explore.noClasses": "لا توجد حصص مجدولة",
    "explore.noClassesSub": "تحقق لاحقاً من الحصص الجديدة",
    "clubs.title": "كل الأندية",
    "clubs.subtitle": "{count} نادٍ على نوادي",
    "clubs.search": "ابحث عن نادٍ أو مدينة…",
    "clubs.all": "الكل",
    "clubs.notFound": "لم يُعثر على أندية",
    "clubs.notFoundSub": "جرّب بحثاً أو فلتراً مختلفاً",
    "schedule.title": "جدول الحصص",
    "schedule.subtitle": "الحصص القادمة في كل الأندية",
    "schedule.search": "ابحث عن حصة أو مدرب أو نادٍ…",
    "account.title": "حسابي",
    "account.subtitle": "إدارة العضوية والأندية المحفوظة",
    "account.signedIn": "مسجّل الدخول",
    "account.member": "العضو",
    "account.club": "النادي",
    "account.openClub": "فتح ناديي",
    "account.signOut": "تسجيل الخروج",
    "account.switchClub": "تغيير النادي",
    "account.notSignedIn": "غير مسجّل في نادٍ",
    "account.notSignedInSub": "تصفح الأندية وافتح الملف وسجّل الدخول للحجز أو الدفع.",
    "account.browseClubs": "تصفح الأندية",
    "account.recent": "شوهد مؤخراً",
    "account.recentEmpty": "الأندية التي تفتحها ستظهر هنا للوصول السريع.",
    "account.favorites": "الأندية المحفوظة",
    "login.title": "دخول الأعضاء",
    "login.subtitle": "سجّل الدخول لحجز الحصص وتسجيل الحضور",
    "login.otp": "رمز",
    "login.password": "كلمة المرور",
    "login.phone": "الهاتف",
    "login.sendCode": "إرسال الرمز",
    "login.verify": "تحقق",
    "login.signIn": "دخول",
    "login.browseOther": "تصفح أندية أخرى",
    "club.classes": "حصص",
    "club.plans": "باقات",
    "club.events": "فعاليات",
    "club.members": "أعضاء",
    "club.signIn": "سجّل الدخول للحجز والدفع",
    "club.dashboard": "لوحة التحكم",
    "club.upcoming": "الحصص القادمة",
    "club.membership": "باقات العضوية",
    "club.contactClub": "تواصل مع النادي لخيارات العضوية.",
    "club.camps": "الفعاليات والمعسكرات",
    "club.noEvents": "لا توجد فعاليات عامة حالياً.",
    "club.contact": "تواصل",
    "club.phone": "الهاتف",
    "club.location": "الموقع",
    "club.notFound": "النادي غير موجود",
    "club.notFoundSub": "قد لا يكون النادي مدرجاً أو الرابط غير صحيح.",
    "club.publicEvent": "فعالية عامة",
    "club.signInPurchase": "سجّل الدخول للشراء",
    "error.title": "حدث خطأ",
    "error.retry": "إعادة المحاولة",
    "error.offline": "تحقق من الاتصال وحاول مرة أخرى",
    "payment.verifying": "جاري التحقق من الدفع",
    "payment.success": "تم الدفع بنجاح",
    "payment.failed": "فشل الدفع",
    "payment.back": "العودة للمدفوعات",
    "payment.missingId": "مرجع الدفع مفقود",
    "onboarding.welcome": "مرحباً في نوادي",
    "member.browsePlatform": "استكشف أندية أخرى على نوادي ←",
    "onboarding.subtitle": "اكتشف الأندية واحجز الحصص وأدر عضويتك في تطبيق واحد.",
    "onboarding.browse": "تصفح الأندية",
    "onboarding.signIn": "لدي حساب في نادٍ",
    "onboarding.skip": "تخطي",
    "notifications.title": "الإشعارات",
    "notifications.empty": "لا توجد إشعارات",
    "notifications.emptySub": "ستظهر تحديثات الحجز وإعلانات النادي هنا.",
    "class.detail": "تفاصيل الحصة",
    "class.book": "احجز",
    "class.booked": "محجوز",
    "class.waitlist": "قائمة الانتظار",
    "class.full": "ممتلئ",
    "class.coach": "المدرب",
    "class.location": "الموقع",
    "class.spots": "المقاعد",
    "progression.title": "تقدم الأحزمة",
    "progression.empty": "لا توجد أحزمة ممنوحة بعد",
    "attendance.title": "سجل الحضور",
    "attendance.empty": "لا يوجد حضور مسجّل بعد",
    "settings.language": "اللغة",
    "settings.theme": "المظهر",
    "settings.light": "فاتح",
    "settings.dark": "داكن",
    "settings.system": "النظام",
    "common.loading": "جاري التحميل…",
    "common.today": "اليوم",
    "common.tomorrow": "غداً",
    "common.close": "إغلاق",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.remove": "إزالة",
  },
} as const;

export type MessageKey = keyof typeof messages.en;

type I18nContextValue = {
  locale: Locale;
  isRtl: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  clubTypeName: (nameEn: string, nameAr: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

async function applyRtl(locale: Locale) {
  const rtl = locale === "ar";
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(LOCALE_KEY);
      const initial = saved === "ar" ? "ar" : "en";
      await applyRtl(initial);
      setLocaleState(initial);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback(async (next: Locale) => {
    await AsyncStorage.setItem(LOCALE_KEY, next);
    await applyRtl(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = messages[locale][key] ?? messages.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v));
        }
      }
      return text;
    },
    [locale],
  );

  const clubTypeName = useCallback(
    (nameEn: string, nameAr: string) => (locale === "ar" ? nameAr || nameEn : nameEn),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, isRtl: locale === "ar", setLocale, t, clubTypeName }),
    [locale, setLocale, t, clubTypeName],
  );

  if (!ready) return null;
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n required");
  return ctx;
}
