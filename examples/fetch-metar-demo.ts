/**
 * Demo script showing METAR client usage
 * 
 * Run with: bun run examples/fetch-metar-demo.ts
 */

import { fetchMETAR, fetchAllStations } from '../src/metar/client';
import type { ICAOCode } from '../src/config';

console.log('=== METAR Client Demo ===\n');

// Demo 1: Fetch single station
console.log('1. Fetching METAR for KLGA (LaGuardia Airport, New York)...');
const klgaResult = await fetchMETAR('KLGA');

if (klgaResult.success) {
  const obs = klgaResult.value;
  console.log(`✓ Success!`);
  console.log(`  ICAO: ${obs.icaoCode}`);
  console.log(`  Temperature: ${obs.temperature}°C`);
  console.log(`  Observation Time: ${obs.observationTime.utc.toISOString()}`);
  console.log(`  Raw METAR: ${obs.rawMETAR.substring(0, 80)}...`);
} else {
  console.log(`✗ Failed: ${klgaResult.error.message}`);
}

console.log('\n2. Fetching METAR for all configured stations in parallel...');
const stations: ICAOCode[] = ['KLGA', 'KORD', 'EGLC'];
const startTime = Date.now();
const results = await fetchAllStations(stations);
const elapsed = Date.now() - startTime;

console.log(`✓ Fetched ${results.size} stations in ${elapsed}ms\n`);

for (const [icao, result] of results) {
  if (result.success) {
    const obs = result.value;
    console.log(`  ${icao}: ${obs.temperature}°C at ${obs.observationTime.utc.toISOString()}`);
  } else {
    console.log(`  ${icao}: Failed - ${result.error.message}`);
  }
}

console.log('\n=== Demo Complete ===');
