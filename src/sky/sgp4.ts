/**
 * Les parts de satellite.js que fem servir, importades fitxer a fitxer: l'entrada principal del paquet
 * també carrega una versió WebAssembly amb fils (workers) que no cal i que trenca la compilació.
 */
export { twoline2satrec } from '../../node_modules/satellite.js/dist/io.js';
export { propagate, gstime } from '../../node_modules/satellite.js/dist/propagation.js';
export { degreesToRadians, ecfToLookAngles, eciToEcf, eciToGeodetic } from '../../node_modules/satellite.js/dist/transforms.js';
export { shadowFraction } from '../../node_modules/satellite.js/dist/shadow.js';
export { sunPos } from '../../node_modules/satellite.js/dist/sun.js';
export { jday } from '../../node_modules/satellite.js/dist/ext.js';
export type { SatRec } from '../../node_modules/satellite.js/dist/propagation/SatRec.js';
