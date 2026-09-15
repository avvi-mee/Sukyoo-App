import * as SecureStore from 'expo-secure-store';

// expo-secure-store enforces a ~2048-byte ceiling per value on Android
// (Keystore-backed). A Supabase session (access + refresh token, user
// metadata, JSON-stringified) routinely exceeds that, so a value is split
// across "<key>__0", "<key>__1", ... sub-keys, with a "<key>__count" pointer
// written LAST. That order is the whole point: if a write is killed
// mid-flight, the old __count still points at the old, complete set of
// chunks — never a new count pointing at partially-written ones. A killed
// write fails safe to "the previous session", never to a corrupt one that
// silently logs the user out or crashes on parse.
const CHUNK_SIZE = 1800;

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function chunkKey(key: string, index: number) {
  return `${key}__${index}`;
}

function countKey(key: string) {
  return `${key}__count`;
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(countKey(key), options);
    if (!countStr) return null;
    const count = Number(countStr);

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i), options);
      // A missing chunk means storage was tampered with or cleared
      // partially — fail to "no session", never to a corrupt partial one.
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const oldCountStr = await SecureStore.getItemAsync(countKey(key), options);
    const oldCount = oldCountStr ? Number(oldCountStr) : 0;

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk, options)));
    // Move the pointer only once every chunk is safely written.
    await SecureStore.setItemAsync(countKey(key), String(chunks.length), options);

    // Now safe to drop chunks orphaned by a previous, longer value — __count
    // no longer references them.
    for (let i = chunks.length; i < oldCount; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i), options).catch(() => {});
    }
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(countKey(key), options);
    const count = countStr ? Number(countStr) : 0;
    // Drop the pointer first: if this is interrupted, getItem sees no count
    // and reports "no session" rather than reading orphaned chunks.
    await SecureStore.deleteItemAsync(countKey(key), options).catch(() => {});
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i), options).catch(() => {});
    }
  },
};
