"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/fitness",
    label: "Dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
  },
  {
    href: "/fitness/workout",
    label: "Workout",
    icon: (
      <>
        <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
      </>
    ),
  },
  {
    href: "/fitness/history",
    label: "History",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    href: "/fitness/progress",
    label: "Progress",
    icon: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  },
];

function TabIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function RunningDot() {
  return (
    <span
      role="img"
      aria-label="Sesión en curso"
      className="inline-block h-2 w-2 rounded-full bg-status-green"
    />
  );
}

export function FitnessTabs({ sessionActive }: { sessionActive: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/fitness" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      <nav
        aria-label="Fitness"
        className="mx-auto hidden w-full max-w-5xl gap-1 border-b border-muted lg:flex"
      >
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 first:pl-0 ${
              isActive(href)
                ? "border-accent font-semibold text-accent"
                : "border-transparent text-foreground/70 hover:text-foreground"
            }`}
          >
            {label}
            {href === "/fitness/workout" && sessionActive && <RunningDot />}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Fitness"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-muted bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TABS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
              isActive(href)
                ? "font-semibold text-accent"
                : "text-foreground/60"
            }`}
          >
            <TabIcon>{icon}</TabIcon>
            {label}
            {href === "/fitness/workout" && sessionActive && (
              <span className="absolute top-2 left-1/2 ml-2.5">
                <RunningDot />
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
