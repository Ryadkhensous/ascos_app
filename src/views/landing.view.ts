import fs from 'fs';
import path from 'path';
import { Request } from 'express';

interface AppVersionMeta {
  version: string;
  buildNumber: number;
  apkFileName: string;
  apkSizeBytes?: number;
  releaseNotes: string;
  mandatory: boolean;
  releaseDate: string;
  minSupportedVersion?: string;
}

export function renderLandingHtml(req: Request): string {
  const rootDir = path.resolve(__dirname, '../../');
  const versionJsonPath = path.join(rootDir, 'data/app_version.json');
  const apkPath = path.join(rootDir, 'public/downloads/ascos.apk');

  let meta: AppVersionMeta = {
    version: '1.0.1',
    buildNumber: 2,
    apkFileName: 'ascos.apk',
    apkSizeBytes: 59564864,
    releaseNotes: "• Filtrage automatique des athlètes et chronos par groupe pour les entraîneurs\n• Vue globale et sélective par groupe pour l'administrateur\n• Slide horizontal fluide entre les groupes\n• Formule précise de calcul des dates de naissance et âges révolus\n• Système de mise à jour automatique intégrée (OTA)",
    mandatory: false,
    releaseDate: '2026-10-02',
    minSupportedVersion: '1.0.0',
  };

  try {
    if (fs.existsSync(versionJsonPath)) {
      const content = fs.readFileSync(versionJsonPath, 'utf-8');
      meta = { ...meta, ...JSON.parse(content) };
    }
  } catch (_) {}

  let apkSizeMb = '56.8 Mo';
  if (meta.apkSizeBytes && meta.apkSizeBytes > 0) {
    apkSizeMb = `${(meta.apkSizeBytes / (1024 * 1024)).toFixed(1)} Mo`;
  } else if (fs.existsSync(apkPath)) {
    try {
      const stat = fs.statSync(apkPath);
      apkSizeMb = `${(stat.size / (1024 * 1024)).toFixed(1)} Mo`;
    } catch (_) {}
  }

  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  const downloadUrl = `/downloads/${meta.apkFileName || 'ascos.apk'}`;
  const fullDownloadUrl = `${baseUrl}/downloads/${meta.apkFileName || 'ascos.apk'}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&format=svg&color=00e5ff&bgcolor=0a1128&data=${encodeURIComponent(fullDownloadUrl)}`;

  const notesList = meta.releaseNotes
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<li><span class="bullet">✦</span> ${line.replace(/^•\s*/, '')}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>ASCOS Natation - Télécharger l'Application Officielle (Android & iOS)</title>
  <meta name="description" content="Téléchargez l'application officielle ASCOS Natation pour Android (APK) et iPhone / iPad (iOS). Chronométrage de précision au bassin, feuilles d'appel et records club.">
  <meta name="theme-color" content="#0A1128">

  <!-- Open Graph / Réseaux & WhatsApp -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:title" content="ASCOS Natation - Application Officielle Entraîneur (Android & iOS)">
  <meta property="og:description" content="Téléchargez l'application mobile d'entraînement ASCOS Natation pour Android et iPhone : chronos en direct, feuilles d'appel et détection des PBs. Version ${meta.version}.">
  <meta property="og:image" content="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&auto=format&fit=crop&q=80">

  <!-- Polices Google Fonts Premium -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary-navy: #0A1128;
      --card-navy: #101F42;
      --card-surface: #162A5A;
      --card-surface-hover: #1E3773;
      --electric-cyan: #00E5FF;
      --ocean-blue: #0066FF;
      --aqua-teal: #00B4D8;
      --success-green: #00E676;
      --warning-orange: #FFAB00;
      --danger-red: #FF5252;
      --gold-record: #FFD700;
      --apple-silver: #E2E8F0;
      --text-primary: #F1F5F9;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-cyan: rgba(0, 229, 255, 0.35);
      --glow-cyan: rgba(0, 229, 255, 0.4);
      --glow-blue: rgba(0, 102, 255, 0.45);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-size: 16px; }

    body {
      background-color: var(--primary-navy);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      overflow-x: hidden;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Canvas d'animation aquatique fluide */
    #oceanCanvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 0;
      pointer-events: none;
      opacity: 0.65;
    }

    .bg-grid-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: 
        linear-gradient(to right, rgba(0, 229, 255, 0.02) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 229, 255, 0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      z-index: 0;
      pointer-events: none;
    }

    .ambient-glow {
      position: fixed;
      width: 650px;
      height: 650px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(0, 102, 255, 0.08) 50%, transparent 70%);
      top: -100px;
      right: 10%;
      filter: blur(80px);
      z-index: 0;
      pointer-events: none;
      animation: ambientPulse 12s ease-in-out infinite alternate;
    }
    @keyframes ambientPulse {
      0% { transform: scale(0.9) translate(0, 0); opacity: 0.7; }
      100% { transform: scale(1.15) translate(40px, 30px); opacity: 1; }
    }

    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
      position: relative;
      z-index: 1;
    }

    /* Header */
    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      background: rgba(10, 17, 40, 0.85);
      border-bottom: 1px solid var(--border-subtle);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 78px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
    }
    .brand-icon {
      width: 46px;
      height: 46px;
      background: linear-gradient(135deg, var(--electric-cyan), var(--ocean-blue));
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 22px var(--glow-cyan);
      position: relative;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .brand-icon:hover { transform: scale(1.08) rotate(5deg); }
    .brand-icon svg { width: 25px; height: 25px; fill: var(--primary-navy); z-index: 1; }
    .brand-text h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.5rem;
      font-weight: 900;
      letter-spacing: 1.6px;
      color: var(--electric-cyan);
      line-height: 1.1;
    }
    .brand-text span {
      font-size: 0.72rem;
      color: var(--text-secondary);
      letter-spacing: 0.9px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1.2rem;
    }
    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.92rem;
      font-weight: 600;
      transition: all 0.2s ease;
      display: none;
    }
    @media (min-width: 840px) { .nav-link { display: inline-block; } }
    .nav-link:hover { color: var(--electric-cyan); }

    .btn-nav-ios {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 0.52rem 1.1rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      transition: all 0.25s ease;
    }
    .btn-nav-ios:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: #fff;
      transform: translateY(-2px);
    }

    .btn-nav-download {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(0, 229, 255, 0.15);
      border: 1px solid var(--electric-cyan);
      color: var(--electric-cyan);
      padding: 0.52rem 1.25rem;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 0.88rem;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 14px rgba(0, 229, 255, 0.15);
      cursor: pointer;
    }
    .btn-nav-download:hover {
      background: var(--electric-cyan);
      color: var(--primary-navy);
      box-shadow: 0 0 25px var(--glow-cyan);
      transform: translateY(-2px);
    }

    /* Section Hero */
    .hero { padding: 4.5rem 0 3.5rem; }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4rem;
      align-items: center;
    }
    @media (min-width: 992px) { .hero-grid { grid-template-columns: 1.15fr 0.85fr; } }

    .version-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      background: rgba(0, 229, 255, 0.08);
      border: 1px solid rgba(0, 229, 255, 0.35);
      border-radius: 9999px;
      padding: 0.4rem 1.1rem 0.4rem 0.65rem;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--electric-cyan);
      margin-bottom: 1.6rem;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.12);
    }
    .pulse-dot {
      width: 9px;
      height: 9px;
      background: var(--success-green);
      border-radius: 50%;
      box-shadow: 0 0 12px var(--success-green);
      animation: pulseAnim 1.8s infinite;
    }
    @keyframes pulseAnim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.4); }
    }

    .hero-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.8rem;
      font-weight: 900;
      line-height: 1.12;
      letter-spacing: -0.6px;
      margin-bottom: 1.35rem;
    }
    @media (min-width: 768px) { .hero-title { font-size: 3.7rem; } }

    .gradient-accent {
      background: linear-gradient(135deg, #33EBFF 0%, #00B4D8 50%, #0066FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 40px rgba(0, 229, 255, 0.25);
    }

    .hero-desc {
      font-size: 1.15rem;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 2rem;
      max-width: 580px;
    }

    /* Sélecteur de Plateforme Android / iOS */
    .platform-selector {
      display: inline-flex;
      background: rgba(16, 31, 66, 0.9);
      border: 1px solid var(--border-cyan);
      border-radius: 16px;
      padding: 5px;
      gap: 6px;
      margin-bottom: 1.8rem;
    }
    .platform-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.65rem 1.4rem;
      border-radius: 12px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .platform-btn.active {
      background: var(--electric-cyan);
      color: var(--primary-navy);
      box-shadow: 0 0 18px var(--glow-cyan);
    }
    .platform-btn-ios.active {
      background: #FFFFFF;
      color: #0A1128;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    }
    .platform-btn svg { width: 18px; height: 18px; fill: currentColor; }

    /* Boutons CTA */
    .cta-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.2rem;
      margin-bottom: 2rem;
    }

    .btn-download-glow {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      background: linear-gradient(135deg, var(--electric-cyan), #00A6FB);
      color: var(--primary-navy);
      padding: 1.15rem 2.2rem;
      border-radius: 18px;
      font-family: 'Outfit', sans-serif;
      font-size: 1.12rem;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 10px 35px var(--glow-cyan), 0 2px 6px rgba(0,0,0,0.5);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      cursor: pointer;
      border: none;
    }
    .btn-download-glow:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 16px 45px rgba(0, 229, 255, 0.65), 0 4px 14px rgba(0,0,0,0.4);
    }
    .btn-download-glow svg { width: 24px; height: 24px; fill: currentColor; }

    .btn-apple-glow {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.85rem;
      background: linear-gradient(135deg, #FFFFFF, #E2E8F0);
      color: #0A1128;
      padding: 1.15rem 2.2rem;
      border-radius: 18px;
      font-family: 'Outfit', sans-serif;
      font-size: 1.12rem;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 10px 35px rgba(255, 255, 255, 0.35), 0 2px 6px rgba(0,0,0,0.5);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      border: none;
    }
    .btn-apple-glow:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 16px 45px rgba(255, 255, 255, 0.5), 0 4px 14px rgba(0,0,0,0.4);
    }
    .btn-apple-glow svg { width: 24px; height: 24px; fill: currentColor; }

    .btn-glass {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      padding: 1.12rem 1.6rem;
      border-radius: 18px;
      font-family: 'Outfit', sans-serif;
      font-size: 1.02rem;
      font-weight: 700;
      text-decoration: none;
      backdrop-filter: blur(12px);
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .btn-glass:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--electric-cyan);
      color: var(--electric-cyan);
      transform: translateY(-2px);
    }

    .download-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.6rem;
      font-size: 0.86rem;
      color: var(--text-muted);
    }
    .download-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    .download-meta-item svg { width: 17px; height: 17px; fill: var(--text-secondary); }

    /* Phone Mockup */
    .phone-container {
      perspective: 1200px;
      display: flex;
      justify-content: center;
      position: relative;
    }
    .phone-mockup {
      width: 325px;
      background: #0D1836;
      border-radius: 46px;
      padding: 13px;
      box-shadow: 
        0 30px 70px rgba(0, 0, 0, 0.8),
        0 0 45px rgba(0, 102, 255, 0.25),
        inset 0 0 0 2px rgba(255, 255, 255, 0.15);
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.2s cubic-bezier(0.2, 0, 0.2, 1);
    }
    .phone-glare {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border-radius: 46px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
      pointer-events: none;
      z-index: 20;
    }
    .phone-screen {
      background: #090E20;
      border-radius: 36px;
      padding: 16px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
      position: relative;
    }
    .notch-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-secondary);
      padding: 0 4px 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .notch-camera {
      width: 50px;
      height: 4px;
      background: #040711;
      border-radius: 9999px;
    }

    .interactive-stopwatch {
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(0, 102, 255, 0.16));
      border: 1px solid var(--border-cyan);
      border-radius: 20px;
      padding: 14px;
      text-align: center;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
    }
    .sw-label {
      font-size: 0.68rem;
      color: var(--text-secondary);
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .sw-digits {
      font-family: 'Outfit', monospace;
      font-size: 2.1rem;
      font-weight: 900;
      color: var(--electric-cyan);
      letter-spacing: 1.5px;
      line-height: 1.1;
      text-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
    }
    .sw-controls {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 10px;
    }
    .sw-btn {
      background: rgba(0, 229, 255, 0.2);
      border: 1px solid var(--electric-cyan);
      color: #fff;
      font-family: 'Outfit', sans-serif;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sw-btn:hover {
      background: var(--electric-cyan);
      color: var(--primary-navy);
    }

    .mini-swimmer-list { display: flex; flex-direction: column; gap: 8px; }
    .mini-swimmer-card {
      background: var(--card-surface);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 9px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .mini-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(0, 229, 255, 0.18);
      color: var(--electric-cyan);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.78rem;
    }
    .mini-info h4 { font-size: 0.82rem; font-weight: 700; color: #fff; }
    .mini-info p { font-size: 0.66rem; color: var(--text-secondary); }
    .mini-time-tag {
      font-family: 'Outfit', monospace;
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--electric-cyan);
    }

    .mini-att-title {
      font-size: 0.68rem;
      color: var(--text-secondary);
      font-weight: 700;
      margin-bottom: 6px;
    }
    .mini-att-row { display: flex; gap: 6px; }
    .att-chip {
      flex: 1;
      padding: 6px 0;
      text-align: center;
      border-radius: 8px;
      font-size: 0.68rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
    }
    .att-chip-present { background: rgba(0, 230, 118, 0.15); color: var(--success-green); }
    .att-chip-present.active { background: var(--success-green); color: #000; }
    .att-chip-late { background: rgba(255, 171, 0, 0.15); color: var(--warning-orange); }
    .att-chip-late.active { background: var(--warning-orange); color: #000; }
    .att-chip-absent { background: rgba(255, 82, 82, 0.15); color: var(--danger-red); }
    .att-chip-absent.active { background: var(--danger-red); color: #fff; }

    .badge-record-burst {
      position: absolute;
      top: -18px; right: -24px;
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.95), rgba(255, 160, 0, 0.95));
      color: #0A1128;
      border-radius: 14px;
      padding: 8px 14px;
      font-family: 'Outfit', sans-serif;
      font-size: 0.82rem;
      font-weight: 900;
      box-shadow: 0 12px 30px rgba(255, 215, 0, 0.45);
      z-index: 25;
    }
    .badge-qr-float {
      position: absolute;
      bottom: -25px; left: -28px;
      background: rgba(16, 31, 66, 0.95);
      border: 1px solid var(--border-cyan);
      border-radius: 20px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(14px);
      z-index: 25;
    }
    .badge-qr-img {
      width: 68px; height: 68px;
      border-radius: 10px;
      background: #0A1128;
      padding: 4px;
    }
    .badge-qr-info strong { font-size: 0.88rem; color: var(--electric-cyan); display: block; margin-bottom: 2px; }
    .badge-qr-info p { font-size: 0.72rem; color: var(--text-secondary); line-height: 1.25; }

    /* Guide iOS Spécial */
    .ios-guide-box {
      display: none;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(16, 31, 66, 0.9));
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      padding: 1.8rem;
      margin-top: 1.5rem;
      backdrop-filter: blur(12px);
    }
    .ios-guide-box.show { display: block; }
    .ios-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.2rem;
      margin-top: 1rem;
    }
    .ios-step {
      background: rgba(10, 17, 40, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 1rem;
    }
    .ios-step-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fff;
      color: #0A1128;
      font-weight: 900;
      font-size: 0.85rem;
      margin-bottom: 0.5rem;
    }
    .ios-step h5 { font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 0.3rem; }
    .ios-step p { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; }

    /* Stats Bar */
    .stats-bar {
      margin: 4.5rem 0 3rem;
      background: linear-gradient(135deg, rgba(16, 31, 66, 0.75), rgba(10, 17, 40, 0.85));
      border: 1px solid var(--border-subtle);
      border-radius: 26px;
      padding: 2.2rem 1.5rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2rem;
      text-align: center;
    }
    @media (min-width: 768px) { .stats-grid { grid-template-columns: repeat(4, 1fr); } }
    .stat-number {
      font-family: 'Outfit', sans-serif;
      font-size: 2.8rem;
      font-weight: 900;
      color: var(--electric-cyan);
      line-height: 1.1;
      margin-bottom: 0.3rem;
      text-shadow: 0 0 25px rgba(0, 229, 255, 0.4);
    }
    .stat-label { font-size: 0.9rem; color: var(--text-secondary); font-weight: 600; }

    /* Features Grid */
    .section-title-wrap { text-align: center; margin-bottom: 3.5rem; }
    .section-subtitle {
      color: var(--electric-cyan);
      font-weight: 800;
      font-size: 0.85rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 0.6rem;
      display: inline-block;
    }
    .section-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 2.4rem;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 1.8rem;
      margin-bottom: 6rem;
    }
    .feature-card {
      background: var(--card-navy);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      padding: 2.2rem 1.8rem;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }
    .feature-card:hover {
      transform: translateY(-8px);
      border-color: var(--border-cyan);
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 229, 255, 0.15);
    }
    .feature-icon-box {
      width: 56px; height: 56px;
      border-radius: 16px;
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
    }
    .feature-icon-box svg { width: 28px; height: 28px; fill: var(--electric-cyan); }
    .feature-card h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 0.7rem;
      color: #fff;
    }
    .feature-card p { color: var(--text-secondary); font-size: 0.95rem; line-height: 1.65; }

    /* Steps Section */
    .steps-section {
      background: linear-gradient(180deg, var(--card-navy) 0%, rgba(16, 31, 66, 0.6) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: 32px;
      padding: 3.5rem 2.2rem;
      margin-bottom: 6rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 2.2rem;
      margin-top: 3rem;
    }
    .step-item { display: flex; flex-direction: column; }
    .step-number-wrap { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; }
    .step-number {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--electric-cyan), var(--ocean-blue));
      color: var(--primary-navy);
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px var(--glow-cyan);
    }
    .step-item h4 { font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.6rem; color: #fff; }
    .step-item p { color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6; }

    /* Changelog */
    .changelog-card {
      background: var(--card-navy);
      border: 1px solid var(--border-subtle);
      border-radius: 28px;
      padding: 2.5rem;
      margin-bottom: 6rem;
    }
    .changelog-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.8rem;
      padding-bottom: 1.4rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .changelog-tag {
      background: rgba(0, 230, 118, 0.15);
      color: var(--success-green);
      border: 1px solid rgba(0, 230, 118, 0.3);
      padding: 0.4rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 800;
    }
    .changelog-list { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
    .changelog-list li {
      font-size: 0.98rem;
      color: var(--text-primary);
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
      line-height: 1.6;
    }
    .bullet { color: var(--electric-cyan); font-size: 0.85rem; }

    /* Footer */
    footer {
      margin-top: auto;
      background: #060B1A;
      border-top: 1px solid var(--border-subtle);
      padding: 2.8rem 0 2.2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .footer-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1.8rem;
    }
    .footer-links { display: flex; flex-wrap: wrap; gap: 1.8rem; }
    .footer-links a { color: var(--text-secondary); text-decoration: none; font-weight: 600; }
    .footer-links a:hover { color: var(--electric-cyan); }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(0, 230, 118, 0.1);
      border: 1px solid rgba(0, 230, 118, 0.3);
      color: var(--success-green);
      padding: 0.3rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 700;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem; right: 2rem;
      background: var(--card-navy);
      color: #fff;
      border: 1px solid var(--electric-cyan);
      padding: 1rem 1.6rem;
      border-radius: 16px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7), 0 0 25px var(--glow-cyan);
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-size: 0.95rem;
      font-weight: 700;
      opacity: 0;
      transform: translateY(30px);
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1000;
    }
    .toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }

    .reveal {
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .reveal.active { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body>

  <canvas id="oceanCanvas"></canvas>
  <div class="bg-grid-overlay"></div>
  <div class="ambient-glow"></div>

  <!-- Header -->
  <header>
    <div class="container">
      <div class="nav-inner">
        <a href="/" class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <div class="brand-text">
            <h1>A.S.C.O.S</h1>
            <span>Club Omnisports Natation</span>
          </div>
        </a>

        <div class="nav-actions">
          <a href="#features" class="nav-link">Fonctionnalités</a>
          <a href="#install-guide" class="nav-link">Installation</a>
          <a href="#changelog" class="nav-link">Nouveautés</a>
          <a href="/app" class="btn-nav-ios" target="_blank" title="Ouvrir la version iPhone / Web">
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.59.69-1.12 1.83-.98 2.92 1.07.08 2.16-.57 2.79-1.32z"/></svg>
            Version iOS
          </a>
          <button class="btn-nav-download" onclick="triggerDownload(event)">
            <svg style="width:17px;height:17px;fill:currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            Télécharger APK
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <main>
    <section class="hero">
      <div class="container">
        <div class="hero-grid">
          
          <div class="reveal active">
            <div class="version-pill">
              <span class="pulse-dot"></span>
              <span>Version officielle v${meta.version} (Build #${meta.buildNumber})</span>
            </div>

            <h2 class="hero-title">
              L'application mobile des <span class="gradient-accent">Entraîneurs ASCOS</span>
            </h2>

            <p class="hero-desc">
              Chronométrez au bord du bassin, validez les feuilles d'appel en 1 geste et suivez les records personnels de chaque athlète. Disponible pour <strong>Android</strong> et <strong>iPhone (iOS)</strong>.
            </p>

            <!-- Sélecteur de système Android vs iPhone -->
            <div class="platform-selector">
              <button class="platform-btn active" id="tabAndroid" onclick="switchPlatform('android')">
                <svg viewBox="0 0 24 24"><path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-1.35-.59-2.85-.92-4.47-.92s-3.12.33-4.47.92L5.65 5.67c-.19-.29-.55-.38-.84-.22-.31.16-.42.54-.26.85L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/></svg>
                <span>Android (APK)</span>
              </button>
              <button class="platform-btn platform-btn-ios" id="tabIos" onclick="switchPlatform('ios')">
                <svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.59.69-1.12 1.83-.98 2.92 1.07.08 2.16-.57 2.79-1.32z"/></svg>
                <span>iPhone / iPad (iOS)</span>
              </button>
            </div>

            <!-- Boutons CTA Android -->
            <div id="ctaAndroid">
              <div class="cta-group">
                <button class="btn-download-glow" id="btnDownloadHero" onclick="triggerDownload(event)">
                  <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-1-6h-2V8h-4v5H8l4 4 4-4z"/></svg>
                  <span>Télécharger l'APK (${apkSizeMb})</span>
                </button>

                <button class="btn-glass" onclick="copyDownloadLink()">
                  <svg style="width:19px;height:19px;fill:currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span>Copier le lien</span>
                </button>
              </div>

              <div class="download-meta">
                <div class="download-meta-item">
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>Android 6.0+ (Samsung, Xiaomi, Pixel...)</span>
                </div>
                <div class="download-meta-item">
                  <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                  <span>Mises à jour in-app automatiques</span>
                </div>
              </div>
            </div>

            <!-- Boutons & Guide Rapide iOS -->
            <div id="ctaIos" style="display: none;">
              <div class="cta-group">
                <a href="/app" class="btn-apple-glow" target="_blank">
                  <svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.59.69-1.12 1.83-.98 2.92 1.07.08 2.16-.57 2.79-1.32z"/></svg>
                  <span>Ouvrir ASCOS pour iPhone</span>
                </a>

                <button class="btn-glass" onclick="copyIosLink()">
                  <svg style="width:19px;height:19px;fill:currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                  <span>Copier le lien iOS</span>
                </button>
              </div>

              <div class="ios-guide-box show">
                <div style="font-weight: 800; font-size: 0.95rem; color: #fff; margin-bottom: 0.4rem;">
                  🍏 Installation en 3 clics sur iPhone (Safari) :
                </div>
                <div class="ios-steps">
                  <div class="ios-step">
                    <div class="ios-step-badge">1</div>
                    <h5>Ouvrez sur Safari</h5>
                    <p>Touchez le bouton blanc ci-dessus pour ouvrir l'application dans Safari.</p>
                  </div>
                  <div class="ios-step">
                    <div class="ios-step-badge">2</div>
                    <h5>Bouton Partager</h5>
                    <p>Touchez l'icône Partager en bas (le carré avec une flèche vers le haut ⎋).</p>
                  </div>
                  <div class="ios-step">
                    <div class="ios-step-badge">3</div>
                    <h5>Sur l'écran d'accueil</h5>
                    <p>Sélectionnez <strong>« Sur l'écran d'accueil »</strong>. L'icône ASCOS s'ajoute à votre iPhone !</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Smartphone Mockup 3D Parallaxe -->
          <div class="phone-container">
            <div class="badge-record-burst">
              <span>★</span> RECORD CLUB BATTU ! -0.42s
            </div>

            <div class="phone-mockup" id="phoneMockup">
              <div class="phone-glare"></div>

              <div class="phone-screen">
                <div class="notch-bar">
                  <span>09:41</span>
                  <div class="notch-camera"></div>
                  <span style="color:var(--electric-cyan);">ASCOS 5G</span>
                </div>

                <div class="interactive-stopwatch">
                  <div class="sw-label">Chronomètre Bassin 50m NL</div>
                  <div class="sw-digits" id="swDigits">00:25.84</div>
                  <div class="sw-controls">
                    <button class="sw-btn" id="btnSwToggle" onclick="toggleStopwatch()">Pause</button>
                    <button class="sw-btn" style="background:rgba(255,255,255,0.08);color:var(--text-secondary);" onclick="resetStopwatch()">Reset</button>
                  </div>
                </div>

                <div class="mini-swimmer-list">
                  <div class="mini-swimmer-card" onclick="simulateSwimmerClick(this, '24.95s')">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="mini-avatar">SA</div>
                      <div class="mini-info">
                        <h4>Sami Amara</h4>
                        <p>Groupe Élite • Papillon / NL</p>
                      </div>
                    </div>
                    <span class="mini-time-tag">24.95s</span>
                  </div>

                  <div class="mini-swimmer-card" onclick="simulateSwimmerClick(this, '33.80s')">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="mini-avatar" style="background:rgba(255,215,0,0.2);color:var(--gold-record);">ML</div>
                      <div class="mini-info">
                        <h4>Maya Larbi</h4>
                        <p>Groupe Espoirs • Brasse</p>
                      </div>
                    </div>
                    <span class="mini-time-tag" style="color:var(--gold-record);">★ 33.80s</span>
                  </div>
                </div>

                <div class="mini-att-box">
                  <div class="mini-att-title">Appel séance du jour (Touchez pour tester) :</div>
                  <div class="mini-att-row">
                    <div class="att-chip att-chip-present active" onclick="setAtt(this)">PRÉSENT</div>
                    <div class="att-chip att-chip-late" onclick="setAtt(this)">RETARD</div>
                    <div class="att-chip att-chip-absent" onclick="setAtt(this)">ABSENT</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="badge-qr-float">
              <img src="${qrCodeUrl}" alt="QR Code Téléchargement ASCOS" class="badge-qr-img">
              <div class="badge-qr-info">
                <strong>Scanner avec mobile</strong>
                <p>Ouvrez votre caméra<br>pour installer direct</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Stats Bar -->
    <section class="container reveal">
      <div class="stats-bar">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number" data-target="150" data-suffix="+">0</div>
            <div class="stat-label">Nageurs Suivis au Club</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" data-target="4" data-suffix=" Groupes">0</div>
            <div class="stat-label">Élite, Perf, Espoirs, École</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" data-target="100" data-suffix="%">0</div>
            <div class="stat-label">Détection Automatique des PBs</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" data-target="1" data-suffix=" Tap">0</div>
            <div class="stat-label">Feuille d'Appel au Bassin</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="features" style="padding: 2rem 0 4rem;">
      <div class="container">
        <div class="section-title-wrap reveal">
          <span class="section-subtitle">CONÇU POUR LA PERFORMANCE</span>
          <h2 class="section-heading">L'outil indispensable pour chaque entraîneur</h2>
        </div>

        <div class="features-grid">
          
          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
            </div>
            <h3>Chronomètre Multi-Bassin & PBs</h3>
            <p>Prenez les temps de passage au centième de seconde. L'application compare instantanément la performance aux records personnels (PBs) du nageur et fête chaque record.</p>
          </div>

          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <h3>Pointage d'Assiduité en 1 Geste</h3>
            <p>Fini les fiches papier qui prennent l'eau. Validez l'appel de vos séances avec pointage Présent, Retard (avec calcul des heures réelles) ou Absence en un éclair.</p>
          </div>

          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <h3>Périmètre Strict par Groupe</h3>
            <p>Chaque entraîneur se concentre sur ses nageurs attitrés avec slide horizontal ultra-rapide entre les catégories, pendant que l'administrateur conserve la supervision globale.</p>
          </div>

          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            </div>
            <h3>Mises à Jour Automatiques (OTA)</h3>
            <p>Dès qu'une nouvelle version est publiée sur le serveur, l'application vous avertit et se met à jour en 1 clic sans avoir besoin de passer par le Play Store.</p>
          </div>

          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
            </div>
            <h3>Courbes de Progression & Volume</h3>
            <p>Visualisez la progression temporelle de chaque athlète sur ses nages favorites et obtenez les bilans d'heures réelles d'entraînement pour chaque séance.</p>
          </div>

          <div class="feature-card reveal">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
            <h3>Sécurité & Synchronisation Cloud</h3>
            <p>Toutes les données sont stockées de façon sécurisée sur le serveur avec chiffrement, sauvegardes automatiques et restauration instantanée.</p>
          </div>

        </div>
      </div>
    </section>

    <!-- Guide Installation -->
    <section id="install-guide" class="container reveal">
      <div class="steps-section">
        <div style="text-align:center;max-width:700px;margin:0 auto;">
          <span class="section-subtitle">INSTALLATION FACILE</span>
          <h2 class="section-heading">Comment installer l'application sur votre téléphone ?</h2>
        </div>

        <div class="steps-grid">
          <div class="step-item">
            <div class="step-number-wrap">
              <div class="step-number">🤖</div>
              <h4>Sur Android</h4>
            </div>
            <p>1. Cliquez sur <strong>Télécharger l'APK</strong>.<br>2. Autorisez la source dans les Paramètres Android si demandé.<br>3. Ouvrez le fichier et appuyez sur <strong>Installer</strong>.</p>
          </div>

          <div class="step-item">
            <div class="step-number-wrap">
              <div class="step-number" style="background:#fff;color:#0A1128;">🍎</div>
              <h4>Sur iPhone (Safari)</h4>
            </div>
            <p>1. Ouvrez <strong>ascos-app.onrender.com/app</strong> dans Safari.<br>2. Touchez l'icône Partager (carré avec flèche vers le haut).<br>3. Choisissez <strong>« Sur l'écran d'accueil »</strong>.</p>
          </div>

          <div class="step-item">
            <div class="step-number-wrap">
              <div class="step-number" style="background:var(--success-green);color:#0A1128;">✓</div>
              <h4>Connectez-vous</h4>
            </div>
            <p>Lancez ASCOS et saisissez votre adresse email et mot de passe coach. Vos athlètes et chronos se synchronisent automatiquement !</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Changelog -->
    <section id="changelog" class="container reveal">
      <div class="changelog-card">
        <div class="changelog-header">
          <div>
            <span class="section-subtitle">HISTORIQUE DU CLUB</span>
            <h3 style="font-family:'Outfit',sans-serif;font-size:1.7rem;font-weight:800;">Nouveautés de la version v${meta.version}</h3>
          </div>
          <span class="changelog-tag">Version Actuelle &bull; Build #${meta.buildNumber}</span>
        </div>

        <ul class="changelog-list">
          ${notesList}
        </ul>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer>
    <div class="container">
      <div class="footer-inner">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <strong style="color:#fff;font-family:'Outfit',sans-serif;font-size:1.05rem;">A.S.C.O.S Natation</strong>
            <span class="status-badge">● Serveur Cloud Opérationnel</span>
          </div>
          <p style="font-size:0.82rem;color:var(--text-muted);">Application officielle de gestion des athlètes, chronos et présences du club.</p>
        </div>

        <div class="footer-links">
          <a href="#" onclick="triggerDownload(event)">Télécharger l'APK</a>
          <a href="/app" target="_blank">Version iPhone (Web)</a>
          <a href="/api/docs" target="_blank">Documentation API</a>
          <a href="/api/health" target="_blank">Health Check</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Toast -->
  <div class="toast" id="toastNotification">
    <svg style="width:22px;height:22px;fill:var(--success-green);" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    <span id="toastMessage">Lien copié dans le presse-papiers !</span>
  </div>

  <script>
    // ==========================================
    // TÉLÉCHARGEMENT DIRECT 100% GARANTI DE L'APK
    // ==========================================
    function triggerDownload(e) {
      if (e && e.preventDefault) e.preventDefault();

      const isFile = window.location.protocol === 'file:';
      // En local on utilise le chemin relatif au fichier sur le disque
      const targetUrl = isFile ? './downloads/ascos.apk' : '/downloads/ascos.apk';
      const fallbackUrl = 'https://ascos-app.onrender.com/downloads/ascos.apk';

      // 1. Tenter le téléchargement par ancre invisible avec attribut download
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', 'ascos-v${meta.version}.apk');
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try { document.body.removeChild(link); } catch (_) {}
        }, 200);
      } catch (err) {
        console.warn('Erreur ancre:', err);
      }

      // 2. Déclenchement par navigation pour forcer le téléchargement si l'ancre a été restreinte
      if (!isFile) {
        setTimeout(() => {
          window.location.assign('/downloads/ascos.apk');
        }, 350);
      } else {
        // En file:/// local, ouvrir dans un nouvel onglet pour lancer le téléchargement local
        window.open('./downloads/ascos.apk', '_blank');
      }

      showToast('🚀 Téléchargement lancé ! Vérifiez vos notifications.');
    }

    // ==========================================
    // SÉLECTEUR DE SYSTÈME (Android vs iPhone)
    // ==========================================
    function switchPlatform(p) {
      const tabAndroid = document.getElementById('tabAndroid');
      const tabIos = document.getElementById('tabIos');
      const ctaAndroid = document.getElementById('ctaAndroid');
      const ctaIos = document.getElementById('ctaIos');

      if (p === 'ios') {
        tabAndroid.classList.remove('active');
        tabIos.classList.add('active');
        ctaAndroid.style.display = 'none';
        ctaIos.style.display = 'block';
      } else {
        tabIos.classList.remove('active');
        tabAndroid.classList.add('active');
        ctaIos.style.display = 'none';
        ctaAndroid.style.display = 'block';
      }
    }

    // Détection automatique de l'appareil (iPhone/iPad)
    const isAppleDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isAppleDevice) {
      switchPlatform('ios');
    }

    // ==========================================
    // ANIMATION CANVAS AQUATIQUE
    // ==========================================
    const canvas = document.getElementById('oceanCanvas');
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const bubbles = [];
    for (let i = 0; i < 45; i++) {
      bubbles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 4 + 1.5,
        speed: Math.random() * 0.8 + 0.3,
        drift: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    function animateCanvas() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        b.y -= b.speed;
        b.x += b.drift;
        if (b.y < -10) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = \`rgba(0, 229, 255, \${b.opacity})\`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
        ctx.fill();
        ctx.closePath();
      }
      requestAnimationFrame(animateCanvas);
    }
    animateCanvas();

    // ==========================================
    // PARALLAXE 3D DU TÉLÉPHONE
    // ==========================================
    const phone = document.getElementById('phoneMockup');
    const phoneContainer = document.querySelector('.phone-container');
    if (phoneContainer && window.innerWidth > 992) {
      phoneContainer.addEventListener('mousemove', (e) => {
        const rect = phoneContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateY = (x / rect.width) * 20;
        const rotateX = -(y / rect.height) * 20;
        phone.style.transform = \`rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) scale(1.03)\`;
      });
      phoneContainer.addEventListener('mouseleave', () => {
        phone.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      });
    }

    // ==========================================
    // CHRONOMÈTRE INTERACTIF
    // ==========================================
    let swRunning = true;
    let swTimeMs = 25840;
    let swInterval = null;

    function formatTime(ms) {
      const totalSec = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const seconds = (totalSec % 60).toString().padStart(2, '0');
      const hundredths = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
      return \`\${minutes}:\${seconds}.\${hundredths}\`;
    }

    function startSw() {
      swInterval = setInterval(() => {
        swTimeMs += 30;
        document.getElementById('swDigits').textContent = formatTime(swTimeMs);
      }, 30);
    }
    startSw();

    function toggleStopwatch() {
      const btn = document.getElementById('btnSwToggle');
      if (swRunning) {
        clearInterval(swInterval);
        swRunning = false;
        btn.textContent = 'Reprendre';
        btn.style.background = 'rgba(0, 230, 118, 0.25)';
      } else {
        startSw();
        swRunning = true;
        btn.textContent = 'Pause';
        btn.style.background = '';
      }
    }

    function resetStopwatch() {
      clearInterval(swInterval);
      swTimeMs = 0;
      document.getElementById('swDigits').textContent = '00:00.00';
      if (swRunning) startSw();
    }

    function simulateSwimmerClick(card, time) {
      const digits = document.getElementById('swDigits');
      digits.style.transform = 'scale(1.15)';
      digits.style.transition = 'transform 0.2s';
      setTimeout(() => { digits.style.transform = 'scale(1)'; }, 200);
      card.style.background = 'rgba(0, 229, 255, 0.25)';
      setTimeout(() => { card.style.background = ''; }, 300);
    }

    function setAtt(el) {
      const parent = el.parentElement;
      parent.querySelectorAll('.att-chip').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
    }

    // ==========================================
    // COMPTEURS DE STATS
    // ==========================================
    let countersStarted = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          if (!countersStarted && entry.target.querySelector('.stat-number')) {
            startCounters();
            countersStarted = true;
          }
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    function startCounters() {
      document.querySelectorAll('.stat-number').forEach(counter => {
        const target = parseFloat(counter.getAttribute('data-target'));
        const suffix = counter.getAttribute('data-suffix') || '';
        let current = 0;
        const increment = target / 40;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            counter.textContent = target + suffix;
            clearInterval(timer);
          } else {
            counter.textContent = Math.floor(current) + suffix;
          }
        }, 30);
      });
    }

    // ==========================================
    // COPIE DES LIENS
    // ==========================================
    function copyDownloadLink() {
      const url = window.location.protocol === 'file:' 
        ? 'https://ascos-app.onrender.com/downloads/ascos.apk' 
        : window.location.origin + '/downloads/ascos.apk';
      copyToClipboard(url, 'Lien de téléchargement Android copié !');
    }

    function copyIosLink() {
      const url = window.location.protocol === 'file:' 
        ? 'https://ascos-app.onrender.com/app' 
        : window.location.origin + '/app';
      copyToClipboard(url, 'Lien de l\\'application iPhone copié !');
    }

    function copyToClipboard(text, msg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(msg));
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(msg);
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toastNotification');
      if (msg) document.getElementById('toastMessage').textContent = msg;
      toast.classList.add('show');
      setTimeout(() => { toast.classList.remove('show'); }, 3500);
    }
  </script>
</body>
</html>`;
}
