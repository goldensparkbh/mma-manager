import { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

export default function Login() {
  const { toast } = useToast();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<null | { confirm: (code: string) => Promise<unknown> }>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

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

  const handleSendCode = async () => {
    if (!phone) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم الهاتف بصيغة دولية",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      }
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
      setConfirmationResult(confirmation);
      toast({
        title: "تم الإرسال",
        description: "تم إرسال رمز التحقق إلى الهاتف",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "تعذر إرسال رمز التحقق",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) {
      toast({
        title: "خطأ",
        description: "يرجى طلب رمز التحقق أولاً",
        variant: "destructive",
      });
      return;
    }
    if (!verificationCode) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز التحقق",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      await confirmationResult.confirm(verificationCode);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "رمز التحقق غير صحيح",
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
          src="/logo_light_full.svg"
          alt="Club Logo"
          className="w-48 mb-6"
        />
        <Card className="w-full max-w-md border-none shadow-none lg:border lg:shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-3xl font-bold tracking-tight">مرحباً بك</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              سجل الدخول للمتابعة إلى نظام إدارة النادي
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="email">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
                <TabsTrigger value="phone">الهاتف</TabsTrigger>
              </TabsList>
              <TabsContent value="email" className="space-y-4">
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
              </TabsContent>
              <TabsContent value="phone" className="space-y-4">
                <Input
                  type="tel"
                  placeholder="+973xxxxxxxx"
                  className="h-11 text-left direction-ltr"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-login-phone"
                />
                {confirmationResult ? (
                  <>
                    <Input
                      type="text"
                      placeholder="رمز التحقق"
                      className="h-11"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      data-testid="input-login-code"
                    />
                    <Button
                      className="w-full h-11"
                      onClick={handleVerifyCode}
                      disabled={isSubmitting}
                      data-testid="button-login-verify"
                    >
                      {isSubmitting ? "جاري التحقق..." : "تأكيد الرمز"}
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full h-11"
                    onClick={handleSendCode}
                    disabled={isSubmitting}
                    data-testid="button-login-send-code"
                  >
                    {isSubmitting ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                  </Button>
                )}
                <div id="recaptcha-container" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
