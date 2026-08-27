import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating Android & PWA launcher icon sizes...');

  // Standard sizes requested
  const sizes = [48, 72, 96, 144, 192, 512];

  for (const size of sizes) {
    // Generate launchericon-WxH.png
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(`public/launchericon-${size}x${size}.png`);
    console.log(`Created public/launchericon-${size}x${size}.png`);
  }

  // Standard PWA icon aliases
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('Created public/icon-192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('Created public/icon-512.png');

  // 512x512 maskable icon with safe zone padding
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#0E1210'
    })
    .png()
    .toFile('public/maskable-icon-512.png');
  console.log('Created public/maskable-icon-512.png');

  // Mobile screenshot (1080x1920)
  const mobileSvg = `
  <svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1920" fill="#121411"/>
    <!-- Top Bar -->
    <rect x="40" y="80" width="1000" height="100" rx="30" fill="#1E221E"/>
    <text x="80" y="145" fill="#E1E3DF" font-family="sans-serif" font-size="36" font-weight="bold">Meridian Personal OS</text>
    <!-- Cards -->
    <rect x="40" y="220" width="1000" height="340" rx="36" fill="#1E221E"/>
    <text x="80" y="280" fill="#22C55E" font-family="sans-serif" font-size="28" font-weight="bold">OVERVIEW &amp; STREAK</text>
    <text x="80" y="360" fill="#FFFFFF" font-family="sans-serif" font-size="64" font-weight="bold">14 Days Clean</text>
    <text x="80" y="440" fill="#9E9E9E" font-family="sans-serif" font-size="32">4.5 hrs focused study logged today</text>

    <rect x="40" y="600" width="480" height="300" rx="36" fill="#1E221E"/>
    <text x="80" y="660" fill="#3B82F6" font-family="sans-serif" font-size="26" font-weight="bold">STUDY TIMER</text>
    <text x="80" y="740" fill="#FFFFFF" font-family="sans-serif" font-size="52" font-weight="bold">25:00</text>
    <text x="80" y="810" fill="#9E9E9E" font-family="sans-serif" font-size="28">Deep Work Sprint</text>

    <rect x="560" y="600" width="480" height="300" rx="36" fill="#1E221E"/>
    <text x="600" y="660" fill="#10B981" font-family="sans-serif" font-size="26" font-weight="bold">FINANCE</text>
    <text x="600" y="740" fill="#FFFFFF" font-family="sans-serif" font-size="52" font-weight="bold">+$1,450</text>
    <text x="600" y="810" fill="#9E9E9E" font-family="sans-serif" font-size="28">Net Savings Track</text>

    <!-- Navigation Bar -->
    <rect x="40" y="1760" width="1000" height="120" rx="40" fill="#1E221E"/>
    <circle cx="200" cy="1820" r="30" fill="#22C55E"/>
    <circle cx="420" cy="1820" r="20" fill="#666"/>
    <circle cx="640" cy="1820" r="20" fill="#666"/>
    <circle cx="860" cy="1820" r="20" fill="#666"/>
  </svg>`;
  await sharp(Buffer.from(mobileSvg)).png().toFile('public/screenshot-mobile.png');
  console.log('Created public/screenshot-mobile.png');

  // Desktop screenshot (1920x1080)
  const desktopSvg = `
  <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#121411"/>
    <!-- Sidebar -->
    <rect x="0" y="0" width="280" height="1080" fill="#181B18"/>
    <text x="40" y="70" fill="#22C55E" font-family="sans-serif" font-size="28" font-weight="bold">MERIDIAN OS</text>
    <rect x="20" y="110" width="240" height="48" rx="24" fill="#22C55E" fill-opacity="0.2"/>
    <text x="50" y="142" fill="#22C55E" font-family="sans-serif" font-size="18" font-weight="bold">Overview</text>
    <text x="50" y="202" fill="#888888" font-family="sans-serif" font-size="18">Daily Logbook</text>
    <text x="50" y="262" fill="#888888" font-family="sans-serif" font-size="18">Study Focus</text>
    <text x="50" y="322" fill="#888888" font-family="sans-serif" font-size="18">Recovery Hub</text>
    <text x="50" y="382" fill="#888888" font-family="sans-serif" font-size="18">Finance Ledger</text>
    <!-- Header -->
    <rect x="320" y="30" width="1560" height="70" rx="20" fill="#1E221E"/>
    <text x="360" y="74" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="bold">Dashboard &amp; Daily Systems</text>
    <!-- Content Cards -->
    <rect x="320" y="130" width="760" height="420" rx="28" fill="#1E221E"/>
    <text x="360" y="180" fill="#22C55E" font-family="sans-serif" font-size="20" font-weight="bold">STREAKS &amp; RECOVERY</text>
    <text x="360" y="250" fill="#FFFFFF" font-family="sans-serif" font-size="48" font-weight="bold">14 Days Clean</text>
    <text x="360" y="310" fill="#AAAAAA" font-family="sans-serif" font-size="20">Personal Milestone Achieved</text>

    <rect x="1120" y="130" width="760" height="420" rx="28" fill="#1E221E"/>
    <text x="1160" y="180" fill="#3B82F6" font-family="sans-serif" font-size="20" font-weight="bold">STUDY ENGINE</text>
    <text x="1160" y="250" fill="#FFFFFF" font-family="sans-serif" font-size="48" font-weight="bold">4.5 Hours Logged</text>
    <text x="1160" y="310" fill="#AAAAAA" font-family="sans-serif" font-size="20">6 Pomodoro Sprints Completed</text>

    <rect x="320" y="580" width="1560" height="460" rx="28" fill="#1E221E"/>
    <text x="360" y="630" fill="#EAB308" font-family="sans-serif" font-size="20" font-weight="bold">DAILY TIMELINE &amp; LOGS</text>
  </svg>`;
  await sharp(Buffer.from(desktopSvg)).png().toFile('public/screenshot-desktop.png');
  console.log('Created public/screenshot-desktop.png');
}

generate().catch(console.error);
