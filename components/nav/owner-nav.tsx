"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth/actions";

const NAV_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/inbox", label: "Inbox" },
  { href: "/albums", label: "Albums" },
  { href: "/raw-files", label: "Raw Files" },
  { href: "/trash", label: "Trash" },
  { href: "/shares", label: "Shares" },
];

export function OwnerNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
      <nav className="flex items-center gap-7">
        <Link
          href="/library"
          className="font-display text-lg italic tracking-wide text-foreground"
        >
          Suwar
        </Link>
        {NAV_LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs uppercase tracking-wider transition-colors ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-xs uppercase tracking-wider text-muted transition-colors hover:text-foreground"
        >
          Log out
        </button>
      </form>
    </header>
  );
}
