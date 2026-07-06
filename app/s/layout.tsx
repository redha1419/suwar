export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <header className="px-6 py-4">
        <span className="text-sm font-medium tracking-widest text-neutral-100">
          SUWAR
        </span>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
