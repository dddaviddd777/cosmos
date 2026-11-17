import { useId } from 'react';
import type { BodyInfo } from '../astro/bodies';

/** Petit generador pseudoaleatori estable: cada icona surt sempre igual */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Estrelles escampades dins d'un cercle (cúmuls) */
function scatter(n: number, cx: number, cy: number, radius: number, seed: number, concentrate = 1) {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const a = r() * Math.PI * 2;
    const d = radius * Math.pow(r(), concentrate);
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, s: 1.6 + r() * 3.4 };
  });
}

/**
 * Icona d'un objecte del cel profund segons el tipus: una galàxia espiral o irregular, un cúmul
 * obert o globular, o una nebulosa. Mai una bola, que faria pensar en un planeta.
 */
export function DeepIcon({ body }: { body: BodyInfo }) {
  const id = useId().replace(/:/g, '');
  const type = body.sky!.type.toLowerCase();
  const c = body.color;

  let art: React.ReactNode;
  if (type.includes('galàxia espiral') || type.includes('nostra galàxia')) {
    art = (
      <>
        <defs>
          <radialGradient id={`${id}g`}>
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="35%" stopColor={c} stopOpacity=".85" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform="rotate(-28 50 50)">
          <ellipse cx="50" cy="50" rx="40" ry="17" fill={`url(#${id}g)`} />
          <path d="M50 50 C 66 40, 82 46, 84 55 M50 50 C 34 60, 18 54, 16 45" fill="none" stroke={c} strokeOpacity=".7" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="50" cy="50" rx="8" ry="5" fill="#fff" />
        </g>
      </>
    );
  } else if (type.includes('galàxia')) {
    // Irregular (Núvols de Magalhães): taques de llum desiguals
    art = (
      <>
        <defs>
          <radialGradient id={`${id}g`}>
            <stop offset="0%" stopColor="#fff" stopOpacity=".9" />
            <stop offset="45%" stopColor={c} stopOpacity=".55" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="45" cy="52" rx="34" ry="20" fill={`url(#${id}g)`} transform="rotate(-18 45 52)" />
        <ellipse cx="64" cy="40" rx="18" ry="12" fill={`url(#${id}g)`} />
        <ellipse cx="34" cy="62" rx="14" ry="9" fill={`url(#${id}g)`} />
      </>
    );
  } else if (type.includes('globular')) {
    const stars = scatter(55, 50, 50, 30, 7, 1.8);
    art = (
      <>
        <defs>
          <radialGradient id={`${id}g`}>
            <stop offset="0%" stopColor="#fff" stopOpacity=".95" />
            <stop offset="40%" stopColor={c} stopOpacity=".6" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="34" fill={`url(#${id}g)`} />
        {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.55} fill="#fff" fillOpacity=".85" />)}
      </>
    );
  } else if (type.includes('cúmul')) {
    const two = type.includes('dos');
    const stars = two
      ? [...scatter(9, 33, 50, 15, 3), ...scatter(9, 67, 50, 15, 11)]
      : scatter(12, 50, 50, 28, body.id.length * 13 + 5);
    art = stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={i % 3 === 0 ? c : '#fff'} />);
  } else {
    // Nebulosa: núvol de gas brillant amb unes quantes estrelles
    art = (
      <>
        <defs>
          <radialGradient id={`${id}g`}>
            <stop offset="0%" stopColor={c} stopOpacity=".95" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}h`}>
            <stop offset="0%" stopColor="#8fd3ff" stopOpacity=".75" />
            <stop offset="100%" stopColor="#8fd3ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="46" cy="54" rx="34" ry="26" fill={`url(#${id}g)`} transform="rotate(25 46 54)" />
        <ellipse cx="62" cy="40" rx="20" ry="16" fill={`url(#${id}h)`} />
        {[[50, 50, 3.5], [44, 47, 2.4], [55, 56, 2.2], [30, 35, 1.8], [72, 70, 1.8]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" />
        ))}
      </>
    );
  }

  return <svg viewBox="0 0 100 100">{art}</svg>;
}
