import { Route, Switch, useLocation } from "wouter";
import { PortalAuthProvider } from "@/context/portal-auth-context";
import PortalLogin from "./login";
import PortalHome from "./home";
import PortalPaymentResult from "./payment-result";

function getPortalSlug(path: string): string | undefined {
  return path.match(/^\/portal\/([^/]+)/)?.[1];
}

export default function PortalApp() {
  const [location] = useLocation();
  const slug = getPortalSlug(location);

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
