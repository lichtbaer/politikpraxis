#!/usr/bin/env node
/**
 * Generates a stylized vector map of Europe for the Politikpraxis homepage.
 * Germany gets a special glow effect. Other countries are rendered as
 * simplified polygon outlines.
 *
 * Usage:  node scripts/generate-europe-svg.mjs
 * Output: frontend/public/europe-map.svg
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'frontend', 'public', 'europe-map.svg');

// Simplified country paths (SVG path data) – stylized outlines
// Coordinates are in a ~0-800 x 0-700 viewBox roughly mapping to Europe
const countries = [
  {
    id: 'PT', name: 'Portugal',
    d: 'M132,390 L125,365 L128,340 L140,320 L148,330 L150,355 L152,380 L145,400 L135,405 Z',
  },
  {
    id: 'ES', name: 'Spain',
    d: 'M148,330 L140,320 L145,295 L160,275 L185,265 L220,260 L245,270 L255,280 L250,300 L240,320 L225,340 L210,355 L195,365 L175,375 L155,385 L152,380 L150,355 Z',
  },
  {
    id: 'FR', name: 'France',
    d: 'M245,270 L260,255 L280,240 L305,230 L320,235 L330,250 L325,270 L330,290 L320,310 L300,325 L280,330 L260,320 L250,300 Z',
  },
  {
    id: 'BE', name: 'Belgium',
    d: 'M305,230 L315,222 L328,218 L335,225 L330,235 L320,235 Z',
  },
  {
    id: 'NL', name: 'Netherlands',
    d: 'M315,222 L310,210 L318,200 L332,198 L340,208 L335,218 L328,218 Z',
  },
  {
    id: 'LU', name: 'Luxembourg',
    d: 'M320,235 L330,235 L332,242 L325,244 Z',
  },
  {
    id: 'DE', name: 'Germany',
    d: 'M335,225 L340,208 L345,195 L360,185 L380,180 L400,185 L410,200 L415,220 L410,240 L400,258 L390,270 L375,278 L360,280 L345,275 L335,265 L330,250 Z',
  },
  {
    id: 'CH', name: 'Switzerland',
    d: 'M325,270 L335,265 L345,275 L348,285 L338,290 L328,285 Z',
  },
  {
    id: 'AT', name: 'Austria',
    d: 'M360,280 L375,278 L390,270 L405,272 L418,268 L425,278 L420,290 L405,295 L390,298 L375,295 L362,292 Z',
  },
  {
    id: 'IT', name: 'Italy',
    d: 'M338,290 L348,285 L362,292 L370,305 L365,320 L358,340 L350,360 L342,375 L335,385 L340,395 L348,405 L345,415 L335,410 L330,395 L325,375 L320,355 L315,335 L320,310 L325,295 Z',
  },
  {
    id: 'DK', name: 'Denmark',
    d: 'M345,175 L350,160 L360,150 L372,148 L378,155 L375,168 L368,178 L360,185 L350,182 Z',
  },
  {
    id: 'PL', name: 'Poland',
    d: 'M410,200 L425,192 L445,188 L465,190 L480,198 L485,215 L480,232 L470,245 L455,252 L440,255 L425,258 L418,268 L405,272 L400,258 L410,240 L415,220 Z',
  },
  {
    id: 'CZ', name: 'Czech Republic',
    d: 'M390,270 L400,258 L410,240 L415,242 L425,248 L428,258 L425,268 L418,268 L405,272 Z',
  },
  {
    id: 'SK', name: 'Slovakia',
    d: 'M425,258 L440,255 L455,252 L462,258 L458,268 L445,272 L432,270 L425,268 Z',
  },
  {
    id: 'HU', name: 'Hungary',
    d: 'M425,278 L432,270 L445,272 L458,268 L468,272 L475,282 L472,295 L460,302 L445,305 L430,300 L422,292 Z',
  },
  {
    id: 'SE', name: 'Sweden',
    d: 'M375,55 L385,45 L395,50 L400,70 L398,95 L392,120 L385,140 L380,155 L372,148 L368,130 L365,110 L368,85 L370,65 Z',
  },
  {
    id: 'NO', name: 'Norway',
    d: 'M345,30 L360,25 L375,30 L380,45 L375,55 L370,65 L365,80 L358,100 L350,120 L345,140 L340,155 L335,145 L332,125 L335,105 L340,80 L342,55 Z',
  },
  {
    id: 'FI', name: 'Finland',
    d: 'M420,25 L435,20 L448,28 L455,50 L452,75 L448,100 L440,120 L430,135 L420,125 L415,105 L412,80 L415,55 L418,38 Z',
  },
  {
    id: 'GB', name: 'United Kingdom',
    d: 'M240,170 L255,155 L268,150 L278,158 L280,175 L275,192 L268,205 L258,215 L248,218 L240,210 L235,195 L238,180 Z',
  },
  {
    id: 'IE', name: 'Ireland',
    d: 'M215,175 L225,165 L235,168 L238,180 L235,195 L228,200 L218,198 L212,188 Z',
  },
  {
    id: 'RO', name: 'Romania',
    d: 'M472,295 L475,282 L485,275 L500,272 L518,278 L528,290 L525,305 L515,315 L500,318 L485,315 L475,308 Z',
  },
  {
    id: 'BG', name: 'Bulgaria',
    d: 'M500,318 L515,315 L528,318 L538,328 L535,340 L525,348 L510,348 L498,342 L495,330 Z',
  },
  {
    id: 'GR', name: 'Greece',
    d: 'M480,355 L490,345 L498,342 L510,348 L515,360 L510,375 L500,388 L490,395 L480,390 L475,378 L472,365 Z',
  },
  {
    id: 'HR', name: 'Croatia',
    d: 'M400,295 L405,295 L420,292 L430,300 L435,310 L430,320 L420,325 L410,320 L405,310 L398,302 Z',
  },
  {
    id: 'RS', name: 'Serbia',
    d: 'M445,305 L460,302 L472,308 L475,320 L470,332 L458,338 L445,335 L438,325 L440,312 Z',
  },
  {
    id: 'BA', name: 'Bosnia',
    d: 'M420,310 L430,300 L440,305 L440,312 L438,325 L428,330 L418,325 Z',
  },
  {
    id: 'LT', name: 'Lithuania',
    d: 'M450,175 L465,170 L478,172 L482,182 L478,192 L468,195 L455,192 L450,182 Z',
  },
  {
    id: 'LV', name: 'Latvia',
    d: 'M448,158 L462,152 L478,155 L482,165 L478,172 L465,170 L450,168 Z',
  },
  {
    id: 'EE', name: 'Estonia',
    d: 'M445,140 L458,135 L472,138 L475,148 L470,155 L458,155 L448,152 Z',
  },
  {
    id: 'UA', name: 'Ukraine',
    d: 'M485,215 L500,205 L525,200 L550,205 L568,218 L575,238 L570,258 L558,272 L540,278 L525,275 L510,268 L500,260 L490,248 L485,232 Z',
  },
  {
    id: 'BY', name: 'Belarus',
    d: 'M480,198 L485,185 L498,178 L515,180 L528,188 L530,200 L525,210 L515,215 L500,212 L490,205 Z',
  },
  {
    id: 'AL', name: 'Albania',
    d: 'M462,348 L470,342 L475,350 L475,365 L470,372 L462,368 L458,358 Z',
  },
  {
    id: 'MK', name: 'North Macedonia',
    d: 'M470,342 L480,338 L490,340 L490,350 L485,358 L475,358 L470,352 Z',
  },
  {
    id: 'ME', name: 'Montenegro',
    d: 'M442,338 L452,332 L462,338 L462,348 L458,358 L448,355 L442,348 Z',
  },
  {
    id: 'SI', name: 'Slovenia',
    d: 'M375,295 L390,298 L400,295 L398,302 L392,308 L380,308 L374,302 Z',
  },
];

// Build SVG
const countryPaths = countries.map(c => {
  const isGermany = c.id === 'DE';
  const fill = isGermany ? 'url(#de-glow)' : 'var(--map-country, rgba(200,168,74,0.12))';
  const stroke = isGermany ? 'var(--map-de-stroke, rgba(200,168,74,0.7))' : 'var(--map-stroke, rgba(200,168,74,0.18))';
  const strokeWidth = isGermany ? '2' : '0.8';
  const extra = isGermany ? ' filter="url(#glow)"' : '';
  return `    <path id="${c.id}" d="${c.d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"${extra}>
      <title>${c.name}</title>
    </path>`;
}).join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="100 0 520 440" fill="none" preserveAspectRatio="xMidYMid meet">
  <defs>
    <!-- Glow filter for Germany -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Radial gradient for Germany fill -->
    <radialGradient id="de-glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="rgba(200,168,74,0.45)"/>
      <stop offset="60%" stop-color="rgba(200,168,74,0.25)"/>
      <stop offset="100%" stop-color="rgba(200,168,74,0.12)"/>
    </radialGradient>

    <!-- Animated pulse for Germany -->
    <radialGradient id="de-pulse" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="rgba(200,168,74,0.3)">
        <animate attributeName="stop-color"
          values="rgba(200,168,74,0.3);rgba(200,168,74,0.15);rgba(200,168,74,0.3)"
          dur="4s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="rgba(200,168,74,0)">
        <animate attributeName="stop-color"
          values="rgba(200,168,74,0);rgba(200,168,74,0.08);rgba(200,168,74,0)"
          dur="4s" repeatCount="indefinite"/>
      </stop>
    </radialGradient>
  </defs>

  <g class="countries" opacity="0.85">
${countryPaths}
  </g>

  <!-- Extra glow ring around Germany -->
  <circle cx="375" cy="230" r="55" fill="url(#de-pulse)" opacity="0.6">
    <animate attributeName="r" values="50;60;50" dur="4s" repeatCount="indefinite"/>
  </circle>
</svg>
`;

writeFileSync(OUT, svg, 'utf-8');
console.log(`✓ Europe SVG written to ${OUT}`);
