import { Route, Switch, useRoute } from "wouter";
import { PortalAuthProvider } from "@/context/portal-auth-context";
import PortalLogin from "./login";
import PortalHome from "./home";
import PortalPaymentResult from "./payment-result";

export default function PortalApp() {
  const [, params] = useRoute("/portal/:slug");
  const slug = params?.slug;

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Invalid portal link
      </div>
    );
  }

  return (
    <PortalAuthProvider slug={slug}>
      <Switch>
        <Route path="/portal/:slug/payment/result" component={PortalPaymentResult} />
        <Route path="/portal/:slug/home" component={PortalHome} />
        <Route path="/portal/:slug" component={PortalLogin} />
      </Switch>
    </PortalAuthProvider>
  );
}
