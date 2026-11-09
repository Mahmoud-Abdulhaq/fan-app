import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Kits from "@/pages/kits";
import KitDetail from "@/pages/kit-detail";
import CounterPage from "@/pages/counter";
import Compare from "@/pages/compare";
import Guide from "@/pages/guide";
import { usePageMeta } from "@/lib/bw";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#7F1D1D",
    colorForeground: "#F87171",
    colorMutedForeground: "#F87171",
    colorDanger: "#F87171",
    colorBackground: "#120A0C",
    colorInput: "#090708",
    colorInputForeground: "#F87171",
    colorNeutral: "#F87171",
    fontFamily: "'Barlow', system-ui, sans-serif",
    borderRadius: "0.6rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#120A0C] border border-[#482027] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-100 font-bold text-2xl [font-family:'Chakra_Petch',sans-serif]",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-100 font-semibold",
    formFieldLabel: "text-slate-200",
    footerActionLink: "text-red-400 font-semibold hover:text-red-300",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-red-400",
    formFieldSuccessText: "text-green-300",
    alertText: "text-slate-100",
    logoBox: "justify-center",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border border-[#482027] bg-[#090708]",
    formButtonPrimary: "bg-red-600 text-white font-bold hover:bg-red-500",
    formFieldInput: "bg-[#090708] border border-[#482027] text-slate-100",
    footerAction: "justify-center",
    dividerLine: "bg-[#482027]",
    alert: "bg-red-500/10 border border-red-500/40",
    otpCodeFieldInput: "bg-[#090708] border border-[#482027] text-slate-100",
    formFieldRow: "gap-2",
    main: "gap-5",
  },
};

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-red-400">BedWars Intel</p>
      {children}
    </div>
  );
}

function SignInPage() {
  usePageMeta("Sign in", "Sign in to save favorites, ratings, and notes.");
  return (
    <AuthShell>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthShell>
  );
}

function SignUpPage() {
  usePageMeta("Create account", "Create a BedWars Intel account.");
  return (
    <AuthShell>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthShell>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Home /></Show>
    </>
  );
}

function DashboardGate() {
  return (
    <>
      <Show when="signed-in"><Dashboard /></Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Layout>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/dashboard" component={DashboardGate} />
              <Route path="/kits" component={Kits} />
              <Route path="/kits/:id" component={KitDetail} />
              <Route path="/counter" component={CounterPage} />
              <Route path="/compare" component={Compare} />
              <Route path="/guide" component={Guide} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
        </Layout>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Back to the lobby", subtitle: "Sign in to your favorites, ratings, and notes" } },
        signUp: { start: { title: "Join BedWars Intel", subtitle: "Save kits, rate them, and keep your own notes" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
