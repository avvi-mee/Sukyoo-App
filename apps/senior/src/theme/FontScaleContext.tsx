import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fontScaleSteps, type FontScaleKey } from './tokens';

const STORAGE_KEY = 'sukyoo.fontScale';

type FontScaleContextValue = {
  scaleKey: FontScaleKey;
  scale: number;
  setScaleKey: (key: FontScaleKey) => void;
};

const FontScaleContext = createContext<FontScaleContextValue>({
  scaleKey: 'default',
  scale: fontScaleSteps.default,
  setScaleKey: () => {},
});

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [scaleKey, setScaleKey] = useState<FontScaleKey>('default');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in fontScaleSteps) setScaleKey(saved as FontScaleKey);
    });
  }, []);

  const value = useMemo<FontScaleContextValue>(
    () => ({
      scaleKey,
      scale: fontScaleSteps[scaleKey],
      setScaleKey: (key) => {
        setScaleKey(key);
        AsyncStorage.setItem(STORAGE_KEY, key);
      },
    }),
    [scaleKey]
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
