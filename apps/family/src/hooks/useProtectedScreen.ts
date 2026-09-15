import { usePreventScreenCapture } from 'expo-screen-capture';

/**
 * Blocks screenshots, screen recording and the app-switcher thumbnail for as
 * long as the calling screen is focused.
 *
 * Use it on any screen showing health data or life-story recordings. The
 * app-switcher part matters as much as the screenshot part: without it the OS
 * keeps a snapshot of the last frame, so a senior's blood-sugar reading or
 * insurance claim sits in the task switcher for anyone who picks up the phone.
 *
 * Android gets FLAG_SECURE; iOS gets a privacy blur when the app leaves focus.
 *
 * The `key` namespaces the request so two protected screens mounted at once
 * don't release each other's protection on unmount.
 */
export function useProtectedScreen(key: string) {
  usePreventScreenCapture(key);
}
