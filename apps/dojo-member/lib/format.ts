const CURRENCY_SYMBOLS: Record<string, string> = {
  BHD: "BHD",
  SAR: "SAR",
  AED: "AED",
  KWD: "KWD",
  QAR: "QAR",
  OMR: "OMR",
  USD: "$",
  EUR: "€",
};

export function formatCurrency(amount: number, currency = "BHD", locale = "en") {
  const code = currency.toUpperCase();
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-BH" : "en-BH", {
    minimumFractionDigits: code === "BHD" || code === "KWD" || code === "OMR" ? 3 : 2,
    maximumFractionDigits: code === "BHD" || code === "KWD" || code === "OMR" ? 3 : 2,
  }).format(amount);
  const symbol = CURRENCY_SYMBOLS[code] || code;
  return locale === "ar" ? `${formatted} ${symbol}` : `${formatted} ${symbol}`;
}

export function bookingStatusLabel(status: string, locale: "en" | "ar" = "en") {
  const map: Record<string, { en: string; ar: string }> = {
    confirmed: { en: "Confirmed", ar: "مؤكد" },
    waitlist: { en: "Waitlist", ar: "قائمة الانتظار" },
    cancelled: { en: "Cancelled", ar: "ملغى" },
    attended: { en: "Attended", ar: "حضر" },
    no_show: { en: "No show", ar: "لم يحضر" },
    pending: { en: "Pending", ar: "قيد الانتظار" },
    captured: { en: "Paid", ar: "مدفوع" },
    paid: { en: "Paid", ar: "مدفوع" },
    failed: { en: "Failed", ar: "فشل" },
  };
  return map[status]?.[locale] ?? status;
}

export function bookingStatusTone(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "confirmed" || status === "attended" || status === "captured" || status === "paid") return "success";
  if (status === "waitlist" || status === "pending") return "warning";
  if (status === "cancelled" || status === "no_show" || status === "failed") return "danger";
  return "default";
}
