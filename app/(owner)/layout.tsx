import { requireOwner } from "@/lib/auth/session";
import { OwnerNav } from "@/components/nav/owner-nav";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOwner();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OwnerNav />
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
