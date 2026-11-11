/**
 * Accés al maquinari del dispositiu per a «Troba'l al cel»: ubicació, càmera i sensors d'orientació.
 * Res d'això surt del dispositiu: tots els càlculs es fan localment.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Place } from './sky';

// ── Ubicació ───────────────────────────────────────────────

export const PLACE_PRESETS: Place[] = [
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { name: 'Girona', lat: 41.9794, lon: 2.8214 },
  { name: 'Lleida', lat: 41.6176, lon: 0.62 },
  { name: 'Tarragona', lat: 41.1189, lon: 1.2445 },
  { name: 'València', lat: 39.4699, lon: -0.3763 },
  { name: 'Palma', lat: 39.5696, lon: 2.6502 },
  { name: 'Andorra la Vella', lat: 42.5063, lon: 1.5218 },
  { name: 'Perpinyà', lat: 42.6887, lon: 2.8948 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
];

const PLACE_KEY = 'cosmos.place';

function loadPlace(): Place | null {
  try {
    const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? 'null');
    return p && typeof p.lat === 'number' && typeof p.lon === 'number' ? p : null;
  } catch {
    return null;
  }
}

export type LocationStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

export function useLocation() {
  const [place, setPlaceState] = useState<Place | null>(loadPlace);
  const [status, setStatus] = useState<LocationStatus>(place ? 'ok' : 'idle');

  const setPlace = useCallback((p: Place) => {
    setPlaceState(p);
    setStatus('ok');
    try {
      localStorage.setItem(PLACE_KEY, JSON.stringify(p));
    } catch {
      /* sense emmagatzematge: no passa res */
    }
  }, []);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: 'La teva ubicació' }),
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }, [setPlace]);

  return { place, status, request, setPlace };
}

// ── Càmera ─────────────────────────────────────────────────

export type CameraStatus = 'off' | 'starting' | 'on' | 'denied' | 'unavailable';

export function useCamera(active: boolean, video: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>('off');
  const [size, setSize] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    if (!active) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    setStatus('starting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const v = video.current;
        if (v) {
          v.srcObject = s;
          await v.play().catch(() => undefined);
          setSize({ w: v.videoWidth || 1920, h: v.videoHeight || 1080 });
        }
        setStatus('on');
      })
      .catch((e: DOMException) => setStatus(e.name === 'NotAllowedError' ? 'denied' : 'unavailable'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setStatus('off');
    };
  }, [active, video]);

  return { status, size };
}

// ── Orientació ─────────────────────────────────────────────

export interface OrientationReading {
  alpha: number;
  beta: number;
  gamma: number;
  /** alpha és relatiu al nord (brúixola) i no a una direcció arbitrària */
  absolute: boolean;
}

type IOSOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * A l'iPhone el permís de sensors s'ha de demanar dins d'un toc de l'usuari.
 * Retorna false només si l'usuari el denega.
 */
export async function requestOrientationPermission(): Promise<boolean> {
  const DOE = (globalThis as { DeviceOrientationEvent?: IOSOrientationEvent }).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      return (await DOE.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  return true;
}

export type OrientationStatus = 'off' | 'waiting' | 'on' | 'none';

/**
 * Escolta els sensors. La lectura es desa en un ref (s'actualitza moltes vegades per segon)
 * i `status` diu si n'arriben dades.
 */
export function useOrientation(active: boolean) {
  const reading = useRef<OrientationReading | null>(null);
  const [status, setStatus] = useState<OrientationStatus>('off');

  useEffect(() => {
    if (!active) return;
    setStatus('waiting');
    reading.current = null;
    let gotAbsoluteEvents = false;

    const handle = (e: DeviceOrientationEvent, fromAbsoluteEvent: boolean) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      // Android (Chrome): l'esdeveniment «absolute» ja dona l'alpha respecte al nord
      if (fromAbsoluteEvent) gotAbsoluteEvents = true;
      else if (gotAbsoluteEvents) return;
      let alpha = e.alpha;
      let absolute = fromAbsoluteEvent || e.absolute === true;
      // iPhone: brúixola a webkitCompassHeading (graus en sentit horari des del nord)
      const heading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof heading === 'number' && heading >= 0) {
        alpha = 360 - heading;
        absolute = true;
      }
      reading.current = { alpha, beta: e.beta, gamma: e.gamma, absolute };
      setStatus((s) => (s === 'on' ? s : 'on'));
    };
    const onAbs = (e: Event) => handle(e as DeviceOrientationEvent, true);
    const onRel = (e: Event) => handle(e as DeviceOrientationEvent, false);
    window.addEventListener('deviceorientationabsolute', onAbs);
    window.addEventListener('deviceorientation', onRel);
    // Si en 2 s no arriba cap lectura, el dispositiu no té sensors (p. ex. un ordinador)
    const timer = window.setTimeout(() => setStatus((s) => (s === 'waiting' ? 'none' : s)), 2000);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbs);
      window.removeEventListener('deviceorientation', onRel);
      window.clearTimeout(timer);
      setStatus('off');
    };
  }, [active]);

  return { reading, status };
}

/** Angle de rotació de la pantalla (0 = vertical). */
export function screenAngle(): number {
  const a = screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0;
  return ((a % 360) + 360) % 360;
}
