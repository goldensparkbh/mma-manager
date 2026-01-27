import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "@/lib/i18n/translations";

type Language = "ar" | "en";
type TranslationKey = string; // e.g., "common.save"

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        // Try to get from localStorage, default to 'ar'
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("club-language");
            return (saved === "en" || saved === "ar") ? saved : "ar";
        }
        return "ar";
    });

    const dir = language === "ar" ? "rtl" : "ltr";

    // Update document direction and lang attribute
    useEffect(() => {
        document.documentElement.dir = dir;
        document.documentElement.lang = language;
        localStorage.setItem("club-language", language);
    }, [language, dir]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
    };

    const t = (path: string): string => {
        const keys = path.split(".");
        let current: any = translations[language];

        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = current[key];
            } else {
                // Fallback to key or show error in dev
                console.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
        }

        return typeof current === "string" ? current : path;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
