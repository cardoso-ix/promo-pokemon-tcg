import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDirs = [
  path.resolve(__dirname, '../src/public/assets/products'),
  path.resolve(__dirname, '../dist/public/assets/products')
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const svgs = [
  {
    name: 'p1.svg',
    title: 'BLISTER DUPLO',
    sub: '30 ANOS COPAG',
    grad1: '#3b82f6',
    grad2: '#1d4ed8',
    accent: '#fbbf24'
  },
  {
    name: 'p2.svg',
    title: 'BLISTER QUÁDRUPLO',
    sub: 'FOGO FANTASMAGÓRICO',
    grad1: '#ef4444',
    grad2: '#b91c1c',
    accent: '#f97316'
  },
  {
    name: 'p3.svg',
    title: 'BLISTER TRIPLO',
    sub: 'ADESIVO ESPECIAL',
    grad1: '#8b5cf6',
    grad2: '#6d28d9',
    accent: '#ec4899'
  },
  {
    name: 'p4.svg',
    title: 'BOOSTER BUNDLE',
    sub: 'MEGAEVOLUTION 6 PACKS',
    grad1: '#06b6d4',
    grad2: '#0e7490',
    accent: '#10b981'
  },
  {
    name: 'p5.svg',
    title: 'ELITE TRAINER BOX',
    sub: 'ETB 30 ANOS LUXO',
    grad1: '#f59e0b',
    grad2: '#b45309',
    accent: '#fbbf24'
  },
  {
    name: 'p6.svg',
    title: 'KIT BLISTER TRIPLO',
    sub: 'KIT 2 UNIDADES',
    grad1: '#10b981',
    grad2: '#047857',
    accent: '#34d399'
  },
  {
    name: 'p7.svg',
    title: 'PORTA TEMPEROS',
    sub: 'BAMBU HERMÉTICO',
    grad1: '#78350f',
    grad2: '#451a03',
    accent: '#d97706'
  },
  {
    name: 'p8.svg',
    title: 'BOX CHARIZARD EX',
    sub: 'FOGO SUPREMO TCG',
    grad1: '#c2410c',
    grad2: '#7c2d12',
    accent: '#fbbf24'
  }
];

for (const s of svgs) {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="bg-${s.name.replace('.svg', '')}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${s.grad1}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${s.grad2}" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="24" fill="url(#bg-${s.name.replace('.svg', '')})"/>
  <circle cx="80" cy="65" r="32" fill="#ffffff" fill-opacity="0.12" stroke="${s.accent}" stroke-width="2.5" stroke-dasharray="4 2"/>
  
  <!-- Pokeball Vector Symbol -->
  <circle cx="80" cy="65" r="24" fill="none" stroke="#ffffff" stroke-width="3.5"/>
  <path d="M 56 65 L 104 65" stroke="#ffffff" stroke-width="3.5"/>
  <circle cx="80" cy="65" r="8" fill="#ffffff" stroke="${s.grad2}" stroke-width="3"/>
  <circle cx="80" cy="65" r="3" fill="${s.accent}"/>
  
  <!-- Labels -->
  <rect x="14" y="112" width="132" height="24" rx="8" fill="#070d17" fill-opacity="0.8" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="80" y="123" fill="#ffffff" font-size="8.5" font-family="Inter, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="0.3">${s.title}</text>
  <text x="80" y="132" fill="${s.accent}" font-size="7" font-family="Inter, sans-serif" font-weight="700" text-anchor="middle">${s.sub}</text>
  
  <rect x="50" y="13" width="60" height="16" rx="5" fill="${s.accent}"/>
  <text x="80" y="24" fill="#0b1329" font-size="8" font-family="Outfit, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="0.5">POKÉMON TCG</text>
</svg>`;

  for (const dir of targetDirs) {
    fs.writeFileSync(path.join(dir, s.name), content, 'utf8');
  }
}

console.log('✅ Imagens oficiais em SVG geradas com sucesso para todos os produtos!');
