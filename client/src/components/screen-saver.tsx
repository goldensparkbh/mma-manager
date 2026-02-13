import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogOut, Unlock, Loader2, KeyRound } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function ScreenSaver() {
    const { user, clubSettings, signOutUser } = useAuth();
    const { t, language, dir } = useLanguage();
    const { toast } = useToast();

    const [isLocked, setIsLocked] = useState(() => {
        return localStorage.getItem("system_locked") === "true";
    });

    const [password, setPassword] = useState("");
    const [isUnlocking, setIsUnlocking] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const lockSystem = useCallback(() => {
        if (!isLocked && user && clubSettings?.screensaverEnabled) {
            setIsLocked(true);
            localStorage.setItem("system_locked", "true");
        }
    }, [isLocked, user, clubSettings]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!isLocked && clubSettings?.screensaverEnabled && clubSettings?.screensaverTimeout) {
            timeoutRef.current = setTimeout(lockSystem, clubSettings.screensaverTimeout * 1000);
        }
    }, [isLocked, clubSettings, lockSystem]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => resetTimer();

        if (clubSettings?.screensaverEnabled && !isLocked) {
            events.forEach(event => window.addEventListener(event, handleActivity));
            resetTimer();
        }

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [clubSettings?.screensaverEnabled, isLocked, resetTimer]);

    const handleUnlock = async () => {
        if (!password || !user?.email) return;

        setIsUnlocking(true);
        try {
            await signInWithEmailAndPassword(auth, user.email, password);
            setIsLocked(false);
            localStorage.removeItem("system_locked");
            setPassword("");
            toast({
                title: t("common.success"),
                description: t("common.welcome"),
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: t("common.error"),
                description: t("settings.screensaver.invalidPassword"),
            });
        } finally {
            setIsUnlocking(false);
        }
    };

    const handleLogout = async () => {
        await signOutUser();
        localStorage.removeItem("system_locked");
        setIsLocked(false);
    };

    if (!isLocked || !user) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden" dir={dir}>
            {/* Dark Aesthetic Background */}
            <div className="absolute inset-0 bg-[#0a0a0a] animate-in fade-in duration-700">
                {/* Subtle animated gradient overlay */}
                <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-primary/30 via-transparent to-primary/10 animate-pulse" />

                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            </div>

            <div className="relative w-full max-w-lg animate-in zoom-in-95 fade-in duration-500 delay-150">
                <div className="flex flex-col items-center mb-12">
                    {clubSettings?.logoUrlLight ? (
                        <img
                            src={clubSettings.logoUrlLight}
                            alt={clubSettings.name}
                            className="w-48 h-48 object-contain mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-white/10 flex items-center justify-center mb-8">
                            <KeyRound className="w-12 h-12 text-primary" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2 text-center">
                        {clubSettings?.name || t("common.appName")}
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-white/40 uppercase tracking-widest">{t("common.active")}</span>
                    </div>
                </div>

                <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                    <CardHeader className="text-center pb-2 border-b border-white/5">
                        <CardTitle className="text-xl text-white font-bold">{t("settings.screensaver.unlockTitle")}</CardTitle>
                        <CardDescription className="text-white/50">{t("settings.screensaver.unlockDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                        <div className="space-y-4">
                            <div className="relative group">
                                <Input
                                    type="password"
                                    placeholder={t("settings.screensaver.passwordPlaceholder")}
                                    className="h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-center text-xl focus:ring-primary/50 transition-all rounded-xl"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <Button
                                    size="lg"
                                    className="h-14 text-lg font-bold gap-2 rounded-xl"
                                    onClick={handleUnlock}
                                    disabled={isUnlocking || !password}
                                >
                                    {isUnlocking ? <Loader2 className="animate-spin" /> : <Unlock className="w-5 h-5" />}
                                    {t("settings.screensaver.unlockButton")}
                                </Button>

                                <div className="flex items-center gap-4 pt-2">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="text-[10px] text-white/20 uppercase tracking-widest">{language === 'ar' ? 'أو' : 'OR'}</span>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>

                                <Button
                                    variant="ghost"
                                    size="lg"
                                    className="h-12 text-white/40 hover:text-white hover:bg-white/5 gap-2 rounded-xl"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4" />
                                    {t("settings.screensaver.logoutButton")}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Info Footer */}
                <div className="mt-8 flex justify-center items-center gap-6 text-[10px] text-white/20 uppercase tracking-widest">
                    <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-BH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span>{t('finance.secureMode')}</span>
                </div>
            </div>
        </div>
    );
}
