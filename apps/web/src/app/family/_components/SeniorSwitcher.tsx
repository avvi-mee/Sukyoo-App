import Link from 'next/link';
import type { LinkedSenior } from './getLinkedSeniors';

export function SeniorSwitcher({
  seniors,
  selectedId,
  basePath,
}: {
  seniors: LinkedSenior[];
  selectedId: string;
  basePath: string;
}) {
  if (seniors.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {seniors.map((s) => (
        <Link
          key={s.seniorId}
          href={`${basePath}?senior=${s.seniorId}`}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
            s.seniorId === selectedId
              ? 'border-(--color-coral) bg-(--color-coral-tint) text-(--color-coral)'
              : 'border-(--color-line) text-(--color-ink-muted)'
          }`}
        >
          {s.fullName ?? 'Senior'}
        </Link>
      ))}
    </div>
  );
}
