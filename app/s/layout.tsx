export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-6 py-5">
        <span className="font-display text-lg italic tracking-wide text-foreground">
          Suwar
        </span>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
