import { useSession } from '@sukyoo/core';

export function useCurrentUserId() {
  const { session } = useSession();
  return session?.user.id;
}
