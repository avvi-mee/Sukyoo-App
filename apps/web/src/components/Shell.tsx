import Link from 'next/link';

export function Shell({
  brand,
  nav,
  displayName,
  children,
}: {
  brand: string;
  nav: { href: string; label: string }[];
  displayName: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 border-b border-(--color-line) bg-(--color-surface) md:w-56 md:border-b-0 md:border-r">
        <div className="border-b border-(--color-line) px-5 py-4 md:border-b-0">
          <Link href="/" className="text-base font-extrabold tracking-tight">
            Sukyoo <span className="text-(--color-ink-muted)">{brand}</span>
          </Link>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-(--color-ink) hover:bg-(--color-coral-tint) hover:text-(--color-coral)"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden border-t border-(--color-line) p-4 text-xs text-(--color-ink-muted) md:block">
          {displayName ? <p className="truncate font-medium text-(--color-ink)">{displayName}</p> : null}
          <form action="/auth/signout" method="post" className="mt-2">
            <button type="submit" className="text-(--color-coral) underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
