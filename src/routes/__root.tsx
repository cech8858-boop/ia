import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { User, CreditCard, Home, Sparkles } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-around rounded-[2rem] border border-violet-300/25 bg-[linear-gradient(135deg,oklch(0.25_0.09_285/0.94),oklch(0.13_0.06_275/0.97))] px-3 py-2 shadow-[0_18px_50px_-18px_oklch(0.12_0.12_285/0.9)] backdrop-blur-xl">
          <NavLink to="/" label="Home" icon={<Home className="size-5" />} />
          <NavLink to="/blank" label="" icon={<Sparkles className="size-5" />} ariaLabel="Outils IA" />
          <NavLink to="/account" label="Compte" icon={<User className="size-5" />} />
          <NavLink to="/payments" label="Paiements" icon={<CreditCard className="size-5" />} />
        </div>
      </nav>
      <div className="pb-24">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}

function NavLink({
  to,
  label,
  icon,
  ariaLabel,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel ?? label}
      activeProps={{ className: "bg-primary/20 text-primary shadow-[0_0_24px_oklch(0.78_0.16_78/0.28)]" }}
      className="group inline-flex min-w-16 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium text-violet-100/65 transition hover:bg-white/10 hover:text-white"
    >
      <span>{icon}</span>
      {label && <span className="hidden sm:inline">{label}</span>}
    </Link>
  );
}
