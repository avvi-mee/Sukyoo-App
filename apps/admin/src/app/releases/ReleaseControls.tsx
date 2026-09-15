'use client';

import { useState, useTransition } from 'react';
import { saveFlag, saveRelease } from './actions';
import type { Flag, Release } from './page';

type Message = { kind: 'error' | 'notice'; text: string } | null;

const INPUT = 'rounded-md border border-[--color-line] bg-[--color-surface] px-2.5 py-1.5 text-sm';
const BUTTON =
  'rounded-md bg-[--color-brand] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50';

function Note({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`mt-2 text-sm ${message.kind === 'error' ? 'text-[--color-danger]' : 'text-[--color-ok]'}`}
    >
      {message.text}
    </p>
  );
}

export function ReleaseRow({ release, canManage }: { release: Release; canManage: boolean }) {
  const [form, setForm] = useState({
    minimumVersion: release.minimum_version,
    latestVersion: release.latest_version ?? '',
    maintenanceMode: release.maintenance_mode,
    maintenanceMessage: release.maintenance_message ?? '',
    bannerMessage: release.banner_message ?? '',
    bannerSeverity: release.banner_severity ?? 'info',
  });
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Switching maintenance ON is the one change here that locks people out, so it
  // gets a second click rather than being one keystroke away.
  const arming = form.maintenanceMode && !release.maintenance_mode;

  return (
    <div
      className={`rounded-lg border bg-[--color-surface] p-4 ${
        release.maintenance_mode ? 'border-[--color-danger]' : 'border-[--color-line]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium capitalize">
            {release.app} · {release.platform}
          </span>
          {release.maintenance_mode ? (
            <span className="ml-2 rounded bg-[--color-danger] px-2 py-0.5 text-xs font-bold uppercase text-white">
              locked
            </span>
          ) : null}
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
            requires {release.minimum_version}
            {release.latest_version ? ` · latest ${release.latest_version}` : ''} · updated{' '}
            {new Date(release.updated_at).toLocaleDateString('en-IN')}
          </span>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block font-medium">Minimum version</span>
              <input
                value={form.minimumVersion}
                onChange={(e) => set('minimumVersion', e.target.value)}
                className={`mt-1 w-full ${INPUT}`}
              />
              <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
                Below this, the app forces an upgrade before it can be used.
              </span>
            </label>
            <label className="text-sm">
              <span className="block font-medium">Latest version</span>
              <input
                value={form.latestVersion}
                onChange={(e) => set('latestVersion', e.target.value)}
                className={`mt-1 w-full ${INPUT}`}
              />
              <span className="mt-0.5 block text-xs text-[--color-ink-muted]">
                Shown as an optional update prompt.
              </span>
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => set('maintenanceMode', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Maintenance mode
              <span className="block text-xs text-[--color-danger]">
                Locks everyone out of this app, including the SOS button. Use only for a data incident or a broken
                release.
              </span>
            </span>
          </label>

          {form.maintenanceMode ? (
            <textarea
              rows={2}
              value={form.maintenanceMessage}
              onChange={(e) => set('maintenanceMessage', e.target.value)}
              placeholder="What is happening, and when will it be back? This is all the user sees."
              aria-label="Maintenance message"
              className={`w-full ${INPUT}`}
            />
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-64 flex-1 text-sm">
              <span className="block font-medium">Banner (optional, non-blocking)</span>
              <input
                value={form.bannerMessage}
                onChange={(e) => set('bannerMessage', e.target.value)}
                className={`mt-1 w-full ${INPUT}`}
              />
            </label>
            <label className="text-sm">
              <span className="block font-medium">Severity</span>
              <select
                value={form.bannerSeverity}
                onChange={(e) => set('bannerSeverity', e.target.value)}
                className={`mt-1 ${INPUT}`}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>

          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why — this goes to the audit trail"
            aria-label="Reason"
            className={`w-full ${INPUT}`}
          />

          <button
            type="button"
            disabled={pending || reason.trim().length < 10}
            onClick={() =>
              startTransition(async () => {
                const result = await saveRelease(release.app, release.platform, form, reason);
                setMessage(
                  result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
                );
                if (!result.error) setReason('');
              })
            }
            className={arming ? BUTTON.replace('bg-[--color-brand]', 'bg-[--color-danger]') : BUTTON}
          >
            {pending ? 'Saving…' : arming ? 'Lock this app' : 'Save'}
          </button>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}

export function FlagRow({ flag, canManage }: { flag: Flag; canManage: boolean }) {
  const [isEnabled, setIsEnabled] = useState(flag.is_enabled);
  const [rollout, setRollout] = useState(String(flag.rollout_percent));
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-[--color-line] bg-[--color-surface] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <code className="font-mono text-sm font-medium">{flag.key}</code>
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs font-bold uppercase ${
              flag.is_enabled
                ? 'bg-[--color-ok-tint] text-[--color-ok]'
                : 'bg-[--color-canvas] text-[--color-ink-muted]'
            }`}
          >
            {flag.is_enabled ? `on · ${flag.rollout_percent}%` : 'off'}
          </span>
          <span className="mt-0.5 block text-xs text-[--color-ink-muted]">{flag.description}</span>
        </div>
      </div>

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
            <span className="font-medium">Enabled</span>
          </label>
          <label className="text-sm">
            <span className="block font-medium">Rollout %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => setRollout(e.target.value)}
              className={`mt-1 w-20 ${INPUT}`}
            />
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why"
            aria-label="Reason"
            className={`min-w-56 flex-1 ${INPUT}`}
          />
          <button
            type="button"
            disabled={pending || reason.trim().length < 10}
            onClick={() =>
              startTransition(async () => {
                const result = await saveFlag(flag.key, isEnabled, Number(rollout), reason);
                setMessage(
                  result.error ? { kind: 'error', text: result.error } : { kind: 'notice', text: result.notice! }
                );
                if (!result.error) setReason('');
              })
            }
            className={BUTTON}
          >
            Save
          </button>
        </div>
      ) : null}

      <Note message={message} />
    </div>
  );
}
