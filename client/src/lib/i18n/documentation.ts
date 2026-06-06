export interface DocTopic {
    id: string;
    title: {
        en: string;
        ar: string;
    };
    content: {
        en: string;
        ar: string;
    };
}

export const DOCUMENTATION_TOPICS: DocTopic[] = [
    {
        id: "access",
        title: {
            en: "1. Getting Started & Access",
            ar: "١. البدء والوصول إلى النظام"
        },
        content: {
            en: `
Welcome to MMA Manager! To access the platform:
Login: Enter your registered email and password on the login screen.
Setup Wizard: If this is your first time, the system will guide you through creating your admin account.
Language: You can switch between Arabic and English using the selector in the sidebar.
Profile: Access your profile settings from the bottom of the sidebar.
            `,
            ar: `
أهلاً بك في نظام إدارة النوادي والفنون القتالية! للوصول إلى المنصة:
تسجيل الدخول: أدخل بريدك الإلكتروني المسجل وكلمة المرور في شاشة تسجيل الدخول.
معالج الإعداد: إذا كانت هذه هي المرة الأولى، فسيقوم النظام بإرشادك لإنشاء حساب المدير الخاص بك.
اللغة: يمكنك التبديل بين اللغتين العربية والإنجليزية باستخدام محدد اللغة في الشريط الجانبي.
الملف الشخصي: يمكنك الوصول إلى إعدادات ملفك الشخصي من أسفل الشريط الجانبي.
            `
        }
    },
    {
        id: "dashboard",
        title: {
            en: "2. Dashboard Overview",
            ar: "٢. نظرة عامة على لوحة القيادة"
        },
        content: {
            en: `
The dashboard is your control center. It shows:
Total Members: Number of active and registered members.
Active Subscriptions: Members with current valid plans.
Today's Attendance: Number of members who checked in today.
Revenue Summary: A glimpse of your club's financial performance.
            `,
            ar: `
لوحة القيادة هي مركز التحكم الخاص بك. وهي تظهر:
إجمالي الأعضاء: عدد الأعضاء النشطين والمسجلين.
الاشتراكات النشطة: الأعضاء الذين لديهم خطط صالحة حالياً.
حضور اليوم: عدد الأعضاء الذين سجلوا حضورهم اليوم.
ملخص الإيرادات: لمحة عن الأداء المالي لناديك.
            `
        }
    },
    {
        id: "members",
        title: {
            en: "3. Member Management",
            ar: "٣. إدارة الأعضاء"
        },
        content: {
            en: `
Manage your members effectively:
Add Member: Click the "Add Member" button to register a new member with their personal details, photo, and documents.
Search: Use the search bar to find members by name, ID, or phone number.
Filters: View members by status (Active, Expired, or Expiring Soon).
Member Profile: Click on a member to see their full history, including attendance, belts, and purchases.
Documents: Upload and manage identity documents or health certificates for each member.
            `,
            ar: `
إدارة أعضائك بفعالية:
إضافة عضو: انقر فوق الزر "إضافة عضو" لتسجيل عضو جديد بتفاصيله الشخصية وصورته ومستنداته.
البحث: استخدم شريط البحث للعثور على الأعضاء بالاسم أو الرقم التعريفي أو رقم الهاتف.
التصنيفات: عرض الأعضاء حسب حالتهم (نشط، منتهي الصلاحية، أو سينتهي قريباً).
ملف العضو: انقر فوق العضو لمشاهدة تاريخه الكامل، بما في ذلك الحضور والأحزمة والمشتريات.
المستندات: تحميل وإدارة مستندات الهوية أو الشهادات الصحية لكل عضو.
            `
        }
    },
    {
        id: "subscriptions",
        title: {
            en: "4. Subscriptions & Packages",
            ar: "٤. الاشتراكات والباقات"
        },
        content: {
            en: `
Control membership plans:
Subscription Packages: Define different plans (e.g., Monthly, Quarterly) with specific prices and durations.
New Subscription: Assign a package to a member and set the start date. The system automatically calculates the end date.
Status Tracking: The system visually flags subscriptions that are active, expired, or about to expire.
Invoices & Receipts: Generate professional A4 invoices or thermal receipts. A4 invoices automatically handle balance due summaries and clinic-style layouts for professional presentation.
Renewal: Easily renew a member's plan when it expires.
            `,
            ar: `
التحكم في خطط العضوية:
باقات الاشتراك: حدد خططاً مختلفة (مثل: شهري، ربع سنوي) بأسعار ومدد محددة.
اشتراك جديد: قم بتعيين باقة لعضو وتحديد تاريخ البدء. سيقوم النظام تلقائياً بحساب تاريخ الانتهاء.
تتبع الحالة: يقوم النظام بتمييز الاشتراكات النشطة أو المنتهية أو التي أوشكت على الانتهاء بصرياً.
الفواتير والإيصالات: إصدار فواتير A4 احترافية أو إيصالات حرارية. تتعامل فواتير A4 تلقائياً مع ملخصات الأرصدة المستحقة وتخطيطات بنمط رسمي للحصول على مظهر احترافي.
التجديد: تجديد خطة العضو بسهولة عند انتهائها.
            `
        }
    },
    {
        id: "attendance",
        title: {
            en: "5. Attendance Tracking",
            ar: "٥. تتبع الحضور"
        },
        content: {
            en: `
Keep track of member training sessions:
Daily Attendance: Record who attends each session.
Auto-Sync: The system ensures attendance is linked to valid subscriptions.
History: View detailed attendance reports for each member or for the entire club.
            `,
            ar: `
تتبع جلسات تدريب الأعضاء:
الحضور اليومي: سجل من يحضر كل جلسة.
المزامنة التلقائية: يضمن النظام ربط الحضور بالاشتراكات الصالحة.
السجل: عرض تقارير الحضور التفصيلية لكل عضو أو للنادي بأكمله.
            `
        }
    },
    {
        id: "store",
        title: {
            en: "6. Store & Point of Sale",
            ar: "٦. المتجر ونقطة البيع"
        },
        content: {
            en: `
Sell products and manage inventory:
Inventory: Add products like uniforms, equipment, or supplements with pricing and stock levels.
POS Screen: Use the Point of Sale screen for quick transactions.
Receipts: Generate and print professional receipts. You can choose between Thermal (80mm) for quick sales or A4 Invoice for more formal documentation.
Stock Tracking: The system automatically deducts sold items from your inventory.
            `,
            ar: `
بيع المنتجات وإدارة المخزون:
المخزون: أضف منتجات مثل الملابس الموحدة أو المعدات أو المكملات الغذائية مع التسعير ومستويات المخزون.
شاشة نقطة البيع: استخدم شاشة نقطة البيع لإجراء معاملات سريعة.
الإيصالات: إصدار وطباعة إيصالات احترافية. يمكنك الاختيار بين الإيصال الحراري (80 مم) للمبيعات السريعة أو فاتورة A4 للتوثيق الرسمي.
تتبع المخزون: يقوم النظام تلقائياً بخصم العناصر المباعة من مخزونك.
            `
        }
    },
    {
        id: "financing",
        title: {
            en: "7. Financial Records",
            ar: "٧. السجلات المالية"
        },
        content: {
            en: `
Monitor your club's finances:
Sales History: View all transactions in one place.
Payments: Track cash, card, or bank transfer payments.
Expense Summaries: Get a clear picture of your income and outstanding balances.
            `,
            ar: `
مراقبة الموارد المالية للنادي:
سجل المبيعات: عرض جميع المعاملات في مكان واحد.
المدفوعات: تتبع المدفوعات النقدية أو البطاقة أو التحويل البنكي.
ملخصات المصروفات: احصل على صورة واضحة لدخلك والأرصدة المستحقة.
            `
        }
    },
    {
        id: "settings",
        title: {
            en: "8. System Settings",
            ar: "٨. إعدادات النظام"
        },
        content: {
            en: `
Customize the platform to your needs:
Club Profile: Update your club name, address, and contact info.
Receipt Customization: Configure your printing format (Thermal vs A4). Upload a special logo for thermal printers or a full-page A4 background design for professional invoices.
Screensaver: Enable the system screensaver to protect your data. Set a custom timeout for the lock screen to activate when the system is idle.
Backups: Safeguard your data by creating manual or scheduled backups.
            `,
            ar: `
تخصيص المنصة حسب احتياجاتك:
ملف النادي: قم بتحديث اسم ناديك وعنوانه ومعلومات الاتصال.
تخصيص الإيصالات: قم بتكوين تنسيق الطباعة (حراري مقابل A4). ارفع شعاراً خاصاً للطابعات الحرارية أو تصميماً لخلفية A4 كاملة للفواتير الاحترافية.
شاشة التوقف: تفعيل شاشة التوقف للنظام لحماية بياناتك. قم بتعيين مهلة زمنية مخصصة لشاشة القفل لتفعيلها عند خمول النظام.
النسخ الاحتياطي: حافظ على بياناتك من خلال إنشاء نسخ احتياطية يدوية أو مجدولة.
            `
        }
    }
];
