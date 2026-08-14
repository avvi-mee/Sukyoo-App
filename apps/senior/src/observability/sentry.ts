import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-ops until a real Sentry project exists — set EXPO_PUBLIC_SENTRY_DSN to
// turn this on. Kept deliberately minimal (no source-map upload / Metro
// plugin wiring yet, see the plan's non-engineering dependencies) — this is
// the safe subset that's useful with zero extra account setup.
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.2 });
}

export { Sentry };
