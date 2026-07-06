import Link from "next/link";
import { requireOwner } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";

const NAV_LINKS = [
  { href: "/library", label: "Library" },
  { href: "/inbox", label: "Inbox" },
  { href: "/albums", label: "Albums" },
  { href: "/raw-files", label: "Raw files" },
  { href: "/trash", label: "Trash" },
  { href: "/shares", label: "Shares" },
];

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-900 px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link
            href="/library"
            className="text-sm font-medium tracking-widest text-neutral-100"
          >
            SUWAR
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-wider text-neutral-500 transition-colors hover:text-neutral-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs uppercase tracking-wider text-neutral-500 transition-colors hover:text-neutral-100"
          >
            Log out
          </button>
        </form>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
