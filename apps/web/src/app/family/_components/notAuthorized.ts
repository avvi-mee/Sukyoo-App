// The audited get_*() RPCs (get_vitals, get_medications, etc.) raise a plain
// 'not authorized' exception when the signed-in family member has no active
// grant for that resource type — that's an expected, normal state here
// ("not shared with you yet"), not a crash. Anything else is a real error.
export function isNotAuthorized(message: string | undefined): boolean {
  return !!message && message.toLowerCase().includes('not authorized');
}
