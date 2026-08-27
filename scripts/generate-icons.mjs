import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const fullSvg = fs.readFileSync('public/icon.svg', 'utf-8');

// Foreground SVG for Android Adaptive Icons (centered inside 108x108 viewport, with safe margins)
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="fgRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4ADE80" />
      <stop offset="50%" stop-color="#22C55E" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>

  <!-- Scale slightly down for adaptive icon safe zone (safe area is central 66%) -->
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <!-- Outer Meridian Arc -->
    <path 
      d="M 245,106 A 150,150 0 1 1 245,406" 
      fill="none" 
      stroke="url(#fgRingGrad)" 
      stroke-width="32" 
      stroke-linecap="round" 
    />

    <!-- Inner Concentric Orbit Arc -->
    <path 
      d="M 265,166 A 90,90 0 0 0 265,346" 
      fill="none" 
      stroke="#34D399" 
      stroke-width="26" 
      stroke-linecap="round" 
    />

    <!-- Glowing Center Pulse Core -->
    <circle cx="256" cy="256" r="32" fill="#34D399" opacity="0.6" />
    <circle cx="256" cy="256" r="22" fill="#A7F3D0" />
    <circle cx="256" cy="256" r="14" fill="#FFFFFF" />

    <!-- 4-Point Golden Beacon Star -->
    <g transform="translate(352, 178)">
      <path 
        d="M 0,-18 Q 0,0 18,0 Q 0,0 0,18 Q 0,0 -18,0 Q 0,0 0,-18 Z" 
        fill="#FDE047" 
      />
      <circle cx="0" cy="0" r="3" fill="#FFFFFF" />
    </g>
  </g>
</svg>
`;

function renderPng(svgString, width, height) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

const targets = [
  // Web / PWA icons
  { path: 'public/icon-192.png', size: 192, svg: fullSvg },
  { path: 'public/icon-512.png', size: 512, svg: fullSvg },
  { path: 'public/maskable-icon-512.png', size: 512, svg: fullSvg },
  { path: 'public/launchericon-48x48.png', size: 48, svg: fullSvg },
  { path: 'public/launchericon-72x72.png', size: 72, svg: fullSvg },
  { path: 'public/launchericon-96x96.png', size: 96, svg: fullSvg },
  { path: 'public/launchericon-144x144.png', size: 144, svg: fullSvg },
  { path: 'public/launchericon-192x192.png', size: 192, svg: fullSvg },
  { path: 'public/launchericon-512x512.png', size: 512, svg: fullSvg },

  // Android standard & legacy launcher icons
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png', size: 48, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', size: 48, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png', size: 108, svg: foregroundSvg },

  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png', size: 72, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', size: 72, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png', size: 162, svg: foregroundSvg },

  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', size: 96, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', size: 96, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png', size: 216, svg: foregroundSvg },

  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', size: 144, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', size: 144, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png', size: 324, svg: foregroundSvg },

  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', size: 192, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', size: 192, svg: fullSvg },
  { path: 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', size: 432, svg: foregroundSvg },
];

for (const target of targets) {
  const dir = path.dirname(target.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const png = renderPng(target.svg, target.size, target.size);
  fs.writeFileSync(target.path, png);
  console.log(`Generated: ${target.path} (${target.size}x${target.size})`);
}
console.log('All icons generated successfully!');
