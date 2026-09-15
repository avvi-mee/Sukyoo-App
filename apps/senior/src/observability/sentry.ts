import * as Sentry from '@sentry/react-native';
import { scrubDeep, scrubText, scrubUrl, shouldDropBreadcrumb } from '@sukyoo/core';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// No-ops until a real Sentry project exists — set EXPO_PUBLIC_SENTRY_DSN to
// turn this on.
//
// Everything below the dsn check exists because this app holds health records.
// Sentry's DEFAULTS are the problem, not our own logging: the breadcrumb
// integration captures every fetch/XHR URL, and PostgREST puts its filters in
// the query string, so an untouched crash report would carry
// `vitals_readings?owner_id=eq.<uuid>&vital_type=eq.blood_sugar` — a health
// category bound to a named subject. Storage signed URLs are worse: their
// `token=` is a live one-hour grant to download a senior's life-story audio.
//
// See packages/core/src/scrub.ts and its tests.
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,

    // Explicit rather than relying on the default staying false — this is the
    // flag that would attach IP address and user id to every event.
    sendDefaultPii: false,

    // The app switcher, deep links and console noise are not worth the risk
    // surface; cap what we retain.
    maxBreadcrumbs: 50,

    beforeBreadcrumb(breadcrumb) {
      if (shouldDropBreadcrumb(breadcrumb.category, breadcrumb.level)) return null;

      if (breadcrumb.data?.url) {
        breadcrumb.data.url = scrubUrl(breadcrumb.data.url as string);
      }
      breadcrumb.message = scrubText(breadcrumb.message);
      if (breadcrumb.data) {
        breadcrumb.data = scrubDeep(breadcrumb.data) as Record<string, unknown>;
      }
      return breadcrumb;
    },

    beforeSend(event) {
      // The request URL and its query string.
      if (event.request?.url) event.request.url = scrubUrl(event.request.url);
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
        event.request.query_string = undefined;
      }

      event.message = scrubText(event.message);

      // Exception values routinely embed the failing row — a Supabase error's
      // `details` echoes it verbatim.
      for (const exception of event.exception?.values ?? []) {
        exception.value = scrubText(exception.value);
      }

      if (event.extra) event.extra = scrubDeep(event.extra) as Record<string, unknown>;
      if (event.contexts) event.contexts = scrubDeep(event.contexts) as typeof event.contexts;

      // Device name on iOS is very often the owner's given name.
      if (event.contexts?.device) delete (event.contexts.device as Record<string, unknown>).name;

      return event;
    },
  });
}

export { Sentry };
