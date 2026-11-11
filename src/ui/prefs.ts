import { useEffect, useState } from 'react';

/** Preferència booleana desada al navegador (si l'emmagatzematge no està disponible, només dura la sessió). */
export function useStoredFlag(key: string, initial: boolean): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? initial : v === '1';
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* sense emmagatzematge */
    }
  }, [key, value]);
  return [value, setValue];
}

/**
 * Mode nocturn: tota la pantalla en vermell fosc. Els ulls tarden uns 20 minuts a adaptar-se a la
 * foscor i la llum blanca d'una pantalla ho desfà en un instant; la llum vermella gairebé no l'afecta.
 */
export function useNightMode() {
  const [night, setNight] = useStoredFlag('cosmos.night', false);
  useEffect(() => {
    document.documentElement.classList.toggle('night', night);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#120000' : '#05070f');
  }, [night]);
  return [night, setNight] as const;
}

/** Retorna cert si l'usuari ha demanat reduir les animacions al sistema. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
