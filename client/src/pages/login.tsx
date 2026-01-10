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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 gap-12">
      <img src="/logo_l.svg" alt="Logo" className="h-96 w-auto" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">تسجيل الدخول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="email">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">البريد الإلكتروني</TabsTrigger>
              <TabsTrigger value="phone">الهاتف</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="space-y-4">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-login-email"
              />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
              />
              <Button
                className="w-full"
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-login-phone"
              />
              {confirmationResult ? (
                <>
                  <Input
                    type="text"
                    placeholder="رمز التحقق"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    data-testid="input-login-code"
                  />
                  <Button
                    className="w-full"
                    onClick={handleVerifyCode}
                    disabled={isSubmitting}
                    data-testid="button-login-verify"
                  >
                    {isSubmitting ? "جاري التحقق..." : "تأكيد الرمز"}
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full"
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
  );
}
