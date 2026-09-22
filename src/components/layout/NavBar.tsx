"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Hoy" },
  { href: "/plantillas", label: "Plantillas" },
  { href: "/historial", label: "Historial" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-center gap-8 border-b border-muted px-4 py-4">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "text-accent font-semibold"
                : "text-foreground/70 hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
