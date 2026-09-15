import Link from 'next/link';
import { requirePermission } from '../../lib/auth';
import { createClient } from '../../lib/supabase/server';
import { Shell } from '../../components/Shell';

export const dynamic = 'force-dynamic';

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const staff = await requirePermission('user.read');
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, role, pincode, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // Phone and name only. Searching by anything health-related would put a
  // condition into a URL and a server log, which is the leak this project has
  // already been bitten by once.
  if (q?.trim()) {
    const term = q.trim();
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data: people } = await query;

  return (
    <Shell staff={staff}>
      <header className="mb-6">
        <h1 className="text-xl font-bold">People</h1>
        <p className="mt-1 text-sm text-[--color-ink-muted]">
          Seniors, family members and staff. Health records are not shown here — opening a person&rsquo;s record and
          asking for them is logged against your name.
        </p>
      </header>

      <form className="mb-5 flex gap-2" action="/people">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or phone"
          aria-label="Search people by name or phone"
          className="w-full max-w-md rounded-md border border-[--color-line] bg-[--color-surface] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-[--color-brand] px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      {!people?.length ? (
        <p className="rounded-lg border border-[--color-line] bg-[--color-surface] p-6 text-sm text-[--color-ink-muted]">
          {q ? `Nobody matches “${q}”.` : 'No people yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[--color-line] bg-[--color-surface]">
          <table className="w-full text-sm">
            <thead className="border-b border-[--color-line] text-left text-xs uppercase tracking-wide text-[--color-ink-muted]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-line]">
              {people.map((person) => (
                <tr key={person.id}>
                  <td className="px-4 py-3 font-medium">{person.full_name ?? '—'}</td>
                  <td className="px-4 py-3">{person.role}</td>
                  <td className="px-4 py-3">{person.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-[--color-ink-muted]">
                    {new Date(person.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/people/${person.id}`} className="text-[--color-brand] underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
