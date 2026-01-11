import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

import { useLocation } from "wouter";

import { useAuth } from "@/context/auth-context";

export default function Login() {
  const { toast } = useToast();
  const { clubSettings } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال البريد الإلكتروني وكلمة المرور",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      await signInWithEmailAndPassword(auth, email, password);
      setLocation("/");
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر تسجيل الدخول بالبريد الإلكتروني",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.5fr_1fr]">
      {/* Background/Logo Column */}
      <div className="hidden lg:flex relative flex-col items-center justify-center bg-muted/40 p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[url('/back.png')] bg-cover bg-center" />
        <div className="absolute inset-0 z-10 bg-black/60" /> {/* Darker Overlay */}
      </div>

      {/* Login Form Column */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <img
          src={clubSettings?.logoUrl || "/logo_light_full.svg"}
          alt="Club Logo"
          className="w-48 mb-6 object-contain max-h-32"
        />
        <Card className="w-full max-w-md border-none shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-bold tracking-tight">مرحباً بك</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              سجل الدخول للمتابعة إلى نظام إدارة النادي
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="name@example.com"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-login-email"
              />
              <Input
                type="password"
                placeholder="••••••••"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
              />
              <Button
                className="w-full h-11 text-base"
                onClick={handleEmailLogin}
                disabled={isSubmitting}
                data-testid="button-login-email"
              >
                {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
