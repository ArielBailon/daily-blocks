"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Hoy" },
  { href: "/ahora", label: "Ahora" },
  { href: "/historial", label: "Historial" },
  { href: "/winter-arc", label: "Winter Arc" },
  { href: "/fitness", label: "Fitness" },
  { href: "/plantillas", label: "Plantillas" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 border-b border-muted px-4 py-4">
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
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
