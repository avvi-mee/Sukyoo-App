import Link from 'next/link';
import { can, type Permission, type StaffContext } from '../lib/permissions';

// Nav is permission-filtered so staff aren't shown doors that will slam. This
// is presentation only — the route itself calls requirePermission(), and the
// data behind it is gated by RLS. Three layers, and only the last two are
// controls.
// Only routes that exist — a nav item is a promise. Campaigns are the one 4D
// piece with schema but no console yet, so they are deliberately absent.
const NAV: { href: string; label: string; permission: Permission }[] = [
  { href: '/sos', label: 'SOS queue', permission: 'sos.read' },
  { href: '/people', label: 'People', permission: 'user.read' },
  { href: '/support', label: 'Support', permission: 'support.read' },
  { href: '/pairings', label: 'Pairings & consent', permission: 'compliance.read' },
  { href: '/privacy', label: 'Data requests', permission: 'compliance.read' },
  { href: '/vendors', label: 'Partners', permission: 'vendor.read' },
  { href: '/content', label: 'Content library', permission: 'content.read' },
  { href: '/livestreams', label: 'Livestreams', permission: 'content.read' },
  { href: '/subscriptions', label: 'Subscriptions & orders', permission: 'finance.read' },
  { href: '/releases', label: 'Releases & flags', permission: 'flags.manage' },
  { href: '/audit', label: 'Audit trail', permission: 'audit.read' },
];

export function Shell({ staff, children }: { staff: StaffContext; children: React.ReactNode }) {
  const visible = NAV.filter((item) => can(staff, item.permission));

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-[--color-line] bg-[--color-surface]">
        <div className="border-b border-[--color-line] px-5 py-4">
          <Link href="/" className="text-base font-bold tracking-tight">
            Sukyoo <span className="text-[--color-ink-muted]">Ops</span>
          </Link>
        </div>

        <nav className="p-3">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-[--color-ink] hover:bg-[--color-brand-tint]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[--color-line] p-4 text-xs text-[--color-ink-muted]">
          <p className="truncate font-medium text-[--color-ink]">{staff.email}</p>
          <p className="mt-0.5">{staff.roles.join(', ')}</p>
          {staff.organizationId ? <p className="mt-1">Scoped to one organisation</p> : null}
          <form action="/auth/signout" method="post" className="mt-3">
            <button type="submit" className="text-[--color-brand] underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
