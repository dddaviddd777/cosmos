import type { ReactNode } from 'react';

export type IconName = 'list' | 'sky' | 'bulb' | 'orbit' | 'telescope' | 'moon' | 'external' | 'pin' | 'close' | 'eye' | 'back';

/** Icones de traç fi, totes amb la mateixa graella de 24 px, perquè es vegin iguals a tots els dispositius. */
const PATHS: Record<IconName, ReactNode> = {
  list: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  sky: (
    <>
      <path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" />
      <path d="M17.5 3.5v4M15.5 5.5h4" />
    </>
  ),
  bulb: (
    <>
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.6 1 2.5h6c0-.9.3-1.8 1-2.5A6 6 0 0 0 12 3z" />
      <path d="M9.5 19h5M10.5 21.5h3" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="4.6" />
      <path d="M7.6 13.6C4.4 15 2.6 16.3 3 17.200c.6 1.400 5.200.4 10.200-2.200s8.400-5.800 7.800-7.200c-.4-.9-2.500-.8-5.300.1" />
    </>
  ),
  telescope: (
    <>
      <path d="M4 11.2 15 6.300l1.900 4.200-11 4.900z" />
      <path d="M16.200 5.800 19.400 4.400l1.900 4.200-3.200 1.400" />
      <path d="M10.400 14.200 7.500 21M11.600 13.700 14.500 21" />
    </>
  ),
  moon: <path d="M20 14.300A8.300 8.300 0 1 1 9.700 4a6.600 6.600 0 0 0 10.300 10.300z" />,
  external: (
    <>
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.400-6-10a6 6 0 1 1 12 0c0 4.600-6 10-6 10z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  eye: (
    <>
      <path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" />
      <circle cx="12" cy="12" r="2.800" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
};

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
