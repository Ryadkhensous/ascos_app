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
  const downloadUrl = `${baseUrl}/downloads/${meta.apkFileName || 'ascos.apk'}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&color=00e5ff&bgcolor=0a1128&data=${encodeURIComponent(downloadUrl)}`;

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
  <title>ASCOS Natation - Télécharger l'Application Officielle Entraîneur</title>
  <meta name="description" content="Téléchargez l'application officielle ASCOS Natation pour Android. Chronométrage au bord du bassin, feuilles de présence, suivi des records personnels (PBs) et gestion des groupes d'entraînement.">
  <meta name="theme-color" content="#0A1128">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${baseUrl}">
  <meta property="og:title" content="ASCOS Natation - Application Officielle Entraîneur & Club">
  <meta property="og:description" content="Téléchargez l'application mobile pour vos séances de natation : chronos au bord du bassin, présence en 1 tap et gestion des nageurs. Version ${meta.version}.">
  <meta property="og:image" content="https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&auto=format&fit=crop&q=80">

  <!-- Polices Google Fonts Premium -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

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
      --text-primary: #F1F5F9;
      --text-secondary: #94A3B8;
      --text-muted: #64748B;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-cyan: rgba(0, 229, 255, 0.3);
      --glow-cyan: rgba(0, 229, 255, 0.35);
      --glow-blue: rgba(0, 102, 255, 0.4);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      scroll-behavior: smooth;
      font-size: 16px;
    }

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

    /* Arrière-plan lumineux avec vagues aquatiques diffuses */
    .bg-blobs {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      z-index: 0;
      pointer-events: none;
    }
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.18;
    }
    .blob-1 {
      width: 500px;
      height: 500px;
      background: var(--electric-cyan);
      top: -150px;
      left: 20%;
      animation: floatSlow 18s ease-in-out infinite alternate;
    }
    .blob-2 {
      width: 600px;
      height: 600px;
      background: var(--ocean-blue);
      bottom: 5%;
      right: -100px;
      animation: floatSlow 22s ease-in-out infinite alternate-reverse;
    }
    .blob-3 {
      width: 350px;
      height: 350px;
      background: #7928CA;
      top: 45%;
      left: -80px;
      opacity: 0.12;
    }

    @keyframes floatSlow {
      0% { transform: translateY(0px) rotate(0deg) scale(1); }
      100% { transform: translateY(60px) rotate(25deg) scale(1.1); }
    }

    /* Container global */
    .container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1.5rem;
      position: relative;
      z-index: 1;
    }

    /* En-tête / Barre de navigation */
    header {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(10, 17, 40, 0.85);
      border-bottom: 1px solid var(--border-subtle);
    }
    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 76px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      text-decoration: none;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, var(--electric-cyan), var(--ocean-blue));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 18px var(--glow-cyan);
    }
    .brand-icon svg {
      width: 24px;
      height: 24px;
      fill: var(--primary-navy);
    }
    .brand-text h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.45rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: var(--electric-cyan);
      line-height: 1.1;
    }
    .brand-text span {
      font-size: 0.72rem;
      color: var(--text-secondary);
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .nav-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      transition: color 0.2s ease;
      display: none;
    }
    @media (min-width: 768px) {
      .nav-link { display: inline-block; }
    }
    .nav-link:hover {
      color: var(--electric-cyan);
    }
    .btn-nav-download {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 229, 255, 0.12);
      border: 1px solid var(--electric-cyan);
      color: var(--electric-cyan);
      padding: 0.5rem 1.1rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .btn-nav-download:hover {
      background: var(--electric-cyan);
      color: var(--primary-navy);
      box-shadow: 0 0 18px var(--glow-cyan);
      transform: translateY(-2px);
    }

    /* Section Hero */
    .hero {
      padding: 4rem 0 3rem;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 3.5rem;
      align-items: center;
    }
    @media (min-width: 992px) {
      .hero-grid {
        grid-template-columns: 1.15fr 0.85fr;
      }
    }

    /* Badges */
    .version-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      background: rgba(0, 229, 255, 0.08);
      border: 1px solid rgba(0, 229, 255, 0.35);
      border-radius: 9999px;
      padding: 0.35rem 0.9rem 0.35rem 0.6rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--electric-cyan);
      margin-bottom: 1.5rem;
      backdrop-filter: blur(8px);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--success-green);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--success-green);
      animation: pulseAnim 2s infinite;
    }
    @keyframes pulseAnim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
    }

    .hero-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.6rem;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.5px;
      margin-bottom: 1.25rem;
    }
    @media (min-width: 768px) {
      .hero-title { font-size: 3.4rem; }
    }
    .gradient-text {
      background: linear-gradient(135deg, var(--text-primary) 30%, var(--electric-cyan) 85%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .gradient-accent {
      background: linear-gradient(135deg, var(--electric-cyan), var(--ocean-blue));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-desc {
      font-size: 1.12rem;
      color: var(--text-secondary);
      line-height: 1.65;
      margin-bottom: 2rem;
      max-width: 600px;
    }

    /* Boutons CTA principaux */
    .cta-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.8rem;
      background: linear-gradient(135deg, var(--electric-cyan), #00B4D8);
      color: var(--primary-navy);
      padding: 1.1rem 2rem;
      border-radius: 16px;
      font-family: 'Outfit', sans-serif;
      font-size: 1.1rem;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 8px 30px var(--glow-cyan), 0 2px 8px rgba(0, 0, 0, 0.4);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .btn-primary:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 14px 40px rgba(0, 229, 255, 0.55), 0 4px 12px rgba(0, 0, 0, 0.4);
      background: linear-gradient(135deg, #33EBFF, #00C8E8);
    }
    .btn-primary svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      padding: 1.05rem 1.6rem;
      border-radius: 16px;
      font-family: 'Outfit', sans-serif;
      font-size: 1rem;
      font-weight: 700;
      text-decoration: none;
      backdrop-filter: blur(8px);
      transition: all 0.25s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--electric-cyan);
      color: var(--electric-cyan);
      transform: translateY(-2px);
    }

    /* Méta tags sous le bouton */
    .download-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .download-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }
    .download-meta-item svg {
      width: 16px;
      height: 16px;
      fill: var(--text-secondary);
    }

    /* Mockup Visuel Smartphone au look ASCOS */
    .mockup-wrapper {
      position: relative;
      display: flex;
      justify-content: center;
    }
    .phone-card {
      width: 320px;
      background: var(--card-navy);
      border-radius: 42px;
      padding: 14px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 102, 255, 0.25);
      border: 3px solid rgba(255, 255, 255, 0.12);
      position: relative;
      overflow: hidden;
      transform: perspective(1000px) rotateY(-5deg) rotateX(4deg);
      transition: transform 0.4s ease;
    }
    .phone-card:hover {
      transform: perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.02);
    }
    .phone-screen {
      background: #0A1128;
      border-radius: 32px;
      padding: 16px 14px;
      color: #fff;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }
    .phone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .phone-badge {
      background: rgba(0, 229, 255, 0.15);
      color: var(--electric-cyan);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .mini-swimmer-card {
      background: var(--card-surface);
      border-radius: 12px;
      padding: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .mini-avatar {
      width: 32px;
      height: 32px;
      background: rgba(0, 229, 255, 0.2);
      color: var(--electric-cyan);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.75rem;
    }
    .mini-info h4 {
      font-size: 0.8rem;
      font-weight: 700;
      color: #fff;
    }
    .mini-info p {
      font-size: 0.65rem;
      color: var(--text-secondary);
    }
    .mini-pb-badge {
      background: rgba(255, 215, 0, 0.15);
      color: var(--gold-record);
      padding: 3px 6px;
      border-radius: 6px;
      font-size: 0.68rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .mini-timer-box {
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(0, 102, 255, 0.15));
      border: 1px solid var(--border-cyan);
      border-radius: 14px;
      padding: 12px;
      text-align: center;
    }
    .mini-timer-digits {
      font-family: 'Outfit', monospace;
      font-size: 1.6rem;
      font-weight: 900;
      color: var(--electric-cyan);
      letter-spacing: 1px;
    }
    .mini-attendance-row {
      display: flex;
      gap: 6px;
      margin-top: 4px;
    }
    .mini-att-btn {
      flex: 1;
      padding: 6px 2px;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: 700;
      text-align: center;
      border: none;
    }
    .mini-att-present { background: rgba(0, 230, 118, 0.25); color: var(--success-green); }
    .mini-att-absent { background: rgba(255, 82, 82, 0.25); color: var(--danger-red); }
    .mini-att-late { background: rgba(255, 171, 0, 0.25); color: var(--warning-orange); }

    /* Carte flottante QR Code */
    .floating-qr-card {
      position: absolute;
      bottom: -25px;
      left: -20px;
      background: var(--card-navy);
      border: 1px solid var(--border-cyan);
      border-radius: 18px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6), 0 0 20px var(--glow-cyan);
      animation: floatBadge 6s ease-in-out infinite alternate;
      z-index: 10;
    }
    @keyframes floatBadge {
      0% { transform: translateY(0); }
      100% { transform: translateY(-8px); }
    }
    .floating-qr-img {
      width: 65px;
      height: 65px;
      border-radius: 8px;
      background: #0A1128;
      padding: 4px;
    }
    .floating-qr-text p {
      font-size: 0.72rem;
      color: var(--text-secondary);
      line-height: 1.2;
    }
    .floating-qr-text strong {
      font-size: 0.85rem;
      color: var(--electric-cyan);
      display: block;
      margin-bottom: 2px;
    }

    /* Grille des Fonctionnalités */
    .section-title-wrap {
      text-align: center;
      margin-bottom: 3.5rem;
    }
    .section-subtitle {
      color: var(--electric-cyan);
      font-weight: 800;
      font-size: 0.85rem;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      display: block;
    }
    .section-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 5rem;
    }
    .feature-card {
      background: var(--card-navy);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 2rem 1.7rem;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 3px;
      background: linear-gradient(90deg, transparent, var(--electric-cyan), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .feature-card:hover {
      transform: translateY(-6px);
      border-color: var(--border-cyan);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4), 0 0 25px rgba(0, 229, 255, 0.15);
    }
    .feature-card:hover::before {
      opacity: 1;
    }
    .feature-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.4rem;
    }
    .feature-icon-box svg {
      width: 26px;
      height: 26px;
      fill: var(--electric-cyan);
    }
    .feature-card h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.6rem;
      color: #fff;
    }
    .feature-card p {
      color: var(--text-secondary);
      font-size: 0.94rem;
      line-height: 1.6;
    }

    /* Section Guide d'Installation */
    .steps-section {
      background: linear-gradient(180deg, var(--card-navy) 0%, rgba(16, 31, 66, 0.5) 100%);
      border: 1px solid var(--border-subtle);
      border-radius: 28px;
      padding: 3rem 2rem;
      margin-bottom: 5rem;
      backdrop-filter: blur(12px);
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 2rem;
      margin-top: 2.5rem;
    }
    .step-item {
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .step-number {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--electric-cyan), var(--ocean-blue));
      color: var(--primary-navy);
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 1.15rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.2rem;
      box-shadow: 0 0 15px var(--glow-cyan);
    }
    .step-item h4 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    .step-item p {
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.55;
    }

    /* Carte Notes de Version */
    .changelog-card {
      background: var(--card-navy);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      padding: 2.5rem;
      margin-bottom: 5rem;
    }
    .changelog-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.2rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .changelog-tag {
      background: rgba(0, 230, 118, 0.15);
      color: var(--success-green);
      border: 1px solid rgba(0, 230, 118, 0.3);
      padding: 0.35rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 700;
    }
    .changelog-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
    }
    .changelog-list li {
      font-size: 0.95rem;
      color: var(--text-primary);
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
      line-height: 1.5;
    }
    .bullet {
      color: var(--electric-cyan);
      font-size: 0.8rem;
    }

    /* Pied de page */
    footer {
      margin-top: auto;
      background: #060B1A;
      border-top: 1px solid var(--border-subtle);
      padding: 2.5rem 0 2rem;
      color: var(--text-secondary);
      font-size: 0.88rem;
    }
    .footer-inner {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }
    .footer-links {
      display: flex;
      gap: 1.5rem;
    }
    .footer-links a {
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .footer-links a:hover {
      color: var(--electric-cyan);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(0, 230, 118, 0.1);
      border: 1px solid rgba(0, 230, 118, 0.25);
      color: var(--success-green);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Toast Notification de Copie */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--card-navy);
      color: #fff;
      border: 1px solid var(--electric-cyan);
      padding: 0.85rem 1.4rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px var(--glow-cyan);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1000;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
  </style>
</head>
<body>

  <!-- Arrière-plan lumineux avec vagues diffuses -->
  <div class="bg-blobs">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>

  <!-- Barre de navigation -->
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
          <a href="#install-guide" class="nav-link">Guide d'installation</a>
          <a href="#changelog" class="nav-link">Nouveautés</a>
          <a href="${downloadUrl}" class="btn-nav-download" download="ascos-v${meta.version}.apk">
            <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            Télécharger APK
          </a>
        </div>
      </div>
    </div>
  </header>

  <!-- Section Hero Principale -->
  <main>
    <section class="hero">
      <div class="container">
        <div class="hero-grid">
          
          <!-- Colonne Gauche : Titre, Explication et Boutons de Téléchargement -->
          <div>
            <div class="version-pill">
              <span class="pulse-dot"></span>
              <span>Dernière version disponible : v${meta.version} (Build #${meta.buildNumber})</span>
            </div>

            <h2 class="hero-title">
              L'application mobile des <span class="gradient-accent">Entraîneurs ASCOS</span>
            </h2>

            <p class="hero-desc">
              Chronométrez au bord du bassin, pointez les présences en un geste, consultez l'historique complet des records personnels (PBs) et suivez vos groupes d'entraînement avec une fluidité optimale.
            </p>

            <div class="cta-group">
              <a href="${downloadUrl}" class="btn-primary" id="btnDownloadHero" download="ascos-v${meta.version}.apk">
                <svg viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-1-6h-2V8h-4v5H8l4 4 4-4z"/></svg>
                <span>Télécharger l'APK (${apkSizeMb})</span>
              </a>

              <button class="btn-secondary" onclick="copyDownloadLink()">
                <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                <span>Copier le lien</span>
              </button>
            </div>

            <div class="download-meta">
              <div class="download-meta-item">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>Android 6.0 ou supérieur</span>
              </div>
              <div class="download-meta-item">
                <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                <span>Mise à jour automatique in-app</span>
              </div>
              <div class="download-meta-item">
                <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                <span>Publié le ${meta.releaseDate}</span>
              </div>
            </div>
          </div>

          <!-- Colonne Droite : Mockup Visuel & Carte QR Code -->
          <div class="mockup-wrapper">
            <div class="phone-card">
              <div class="phone-screen">
                <div class="phone-header">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:8px;height:8px;background:var(--electric-cyan);border-radius:50%;"></div>
                    <span style="font-weight:800;font-size:0.75rem;letter-spacing:1px;color:var(--electric-cyan);">ASCOS LIVE</span>
                  </div>
                  <span class="phone-badge">GROUPE ÉLITE</span>
                </div>

                <!-- Simulation d'un chrono de nageur -->
                <div class="mini-timer-box">
                  <div style="font-size:0.65rem;color:var(--text-secondary);text-transform:uppercase;font-weight:700;margin-bottom:2px;">Chrono Bassin 50m NL</div>
                  <div class="mini-timer-digits">00:26.42</div>
                  <div style="display:flex;justify-content:center;gap:8px;margin-top:4px;">
                    <span class="mini-pb-badge">★ NOUVEAU RECORD CLUB</span>
                  </div>
                </div>

                <!-- Simulation d'athlètes avec présence -->
                <div class="mini-swimmer-card">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="mini-avatar">SA</div>
                    <div class="mini-info">
                      <h4>Sami Amara</h4>
                      <p>Élite • Papillon / NL</p>
                    </div>
                  </div>
                  <span style="font-size:0.75rem;font-weight:800;color:var(--electric-cyan);">24.85s</span>
                </div>

                <div class="mini-swimmer-card">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="mini-avatar" style="background:rgba(255,215,0,0.2);color:var(--gold-record);">ML</div>
                    <div class="mini-info">
                      <h4>Maya Larbi</h4>
                      <p>Espoirs • Brasse</p>
                    </div>
                  </div>
                  <span style="font-size:0.75rem;font-weight:800;color:var(--gold-record);">34.12s</span>
                </div>

                <!-- Boutons d'appel de présence -->
                <div style="margin-top:4px;">
                  <div style="font-size:0.65rem;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">Pointage séance du jour :</div>
                  <div class="mini-attendance-row">
                    <span class="mini-att-btn mini-att-present">PRÉSENT</span>
                    <span class="mini-att-btn mini-att-late">RETARD</span>
                    <span class="mini-att-btn mini-att-absent">ABSENT</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Carte Flottante QR Code pour scan smartphone -->
            <div class="floating-qr-card">
              <img src="${qrCodeUrl}" alt="QR Code de téléchargement ASCOS" class="floating-qr-img">
              <div class="floating-qr-text">
                <strong>Scanner avec mobile</strong>
                <p>Ouvrez l'appareil photo<br>pour télécharger direct.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Section des Fonctionnalités -->
    <section id="features" style="padding: 4rem 0;">
      <div class="container">
        <div class="section-title-wrap">
          <span class="section-subtitle">CONÇU POUR LE BASSIN</span>
          <h2 class="section-heading">Tout ce dont un entraîneur a besoin</h2>
        </div>

        <div class="features-grid">
          
          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
            </div>
            <h3>Chronomètre & Records Personnels</h3>
            <p>Prenez les temps de passage et d'arrivée de vos nageurs. L'application compare instantanément la performance aux PBs et signale tout nouveau record personnel.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <h3>Pointage d'Assiduité en 1 Tap</h3>
            <p>Fini les fiches papier mouillées au bord de l'eau. Marquez les présents, retards avec heure d'arrivée et absences en quelques secondes depuis votre téléphone.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <h3>Périmètre Strict par Groupe</h3>
            <p>Chaque entraîneur accède uniquement aux nageurs de son groupe (Élite, Performance, Espoirs, École de Natation), avec slide horizontal rapide entre les spécialités.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
            </div>
            <h3>Mises à Jour Automatiques (OTA)</h3>
            <p>Dès qu'une nouvelle version est disponible sur le serveur du club, l'application vous propose de l'installer automatiquement sans passer par Google Play.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
            </div>
            <h3>Bilans & Progression Graphique</h3>
            <p>Graphiques d'évolution chronométrique, taux de présence par mois et calcul automatisé du volume horaire d'entraînement pour chaque nageur.</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon-box">
              <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            </div>
            <h3>Synchronisation Cloud Sécurisée</h3>
            <p>Vos chronomètres et feuilles d'appel sont instantanément enregistrés sur la base de données centrale du club avec chiffrement JWT.</p>
          </div>

        </div>
      </div>
    </section>

    <!-- Section Guide d'Installation -->
    <section id="install-guide" class="container">
      <div class="steps-section">
        <div style="text-align:center;max-width:700px;margin:0 auto;">
          <span class="section-subtitle">INSTALLATION FACILE</span>
          <h2 class="section-heading">Comment installer l'APK sur Android ?</h2>
          <p style="color:var(--text-secondary);font-size:0.98rem;margin-top:0.5rem;">
            L'application est distribuée directement par le club. Suivez ces 3 étapes simples :
          </p>
        </div>

        <div class="steps-grid">
          <div class="step-item">
            <div class="step-number">1</div>
            <h4>Téléchargez le fichier</h4>
            <p>Cliquez sur le bouton <strong>Télécharger l'APK</strong> ou scannez le QR code avec votre téléphone. Le fichier <code>ascos.apk</code> s'enregistre dans vos téléchargements.</p>
          </div>

          <div class="step-item">
            <div class="step-number">2</div>
            <h4>Autorisez l'installation</h4>
            <p>Si Android affiche <em>« Fichier potentiellement dangereux »</em> ou <em>« Source inconnue »</em>, appuyez sur <strong>Télécharger quand même</strong> puis <strong>Paramètres &gt; Autoriser cette source</strong>.</p>
          </div>

          <div class="step-item">
            <div class="step-number">3</div>
            <h4>Ouvrez et connectez-vous</h4>
            <p>Cliquez sur le fichier téléchargé, appuyez sur <strong>Installer</strong>, puis lancez l'application ASCOS et connectez-vous avec vos identifiants d'entraîneur !</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section Nouveautés / Changelog -->
    <section id="changelog" class="container">
      <div class="changelog-card">
        <div class="changelog-header">
          <div>
            <span class="section-subtitle">HISTORIQUE DES MISES À JOUR</span>
            <h3 style="font-family:'Outfit',sans-serif;font-size:1.6rem;font-weight:800;">Notes de version v${meta.version}</h3>
          </div>
          <span class="changelog-tag">Actuelle &bull; Build #${meta.buildNumber}</span>
        </div>

        <ul class="changelog-list">
          ${notesList}
        </ul>
      </div>
    </section>
  </main>

  <!-- Pied de page -->
  <footer>
    <div class="container">
      <div class="footer-inner">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <strong style="color:#fff;font-family:'Outfit',sans-serif;font-size:1rem;">A.S.C.O.S Natation</strong>
            <span class="status-badge">● Serveur Connecté</span>
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);">Application officielle de gestion des athlètes, chronos et présences du club.</p>
        </div>

        <div class="footer-links">
          <a href="${downloadUrl}" download="ascos-v${meta.version}.apk">Télécharger l'APK</a>
          <a href="/api/docs" target="_blank">Documentation API & Base</a>
          <a href="/api/health" target="_blank">Santé du Serveur</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Toast Notification -->
  <div class="toast" id="toastNotification">
    <svg style="width:20px;height:20px;fill:var(--success-green);" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    <span>Lien de téléchargement copié dans le presse-papiers !</span>
  </div>

  <script>
    function copyDownloadLink() {
      const url = "${downloadUrl}";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(showToast);
      } else {
        const input = document.createElement('textarea');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast();
      }
    }

    function showToast() {
      const toast = document.getElementById('toastNotification');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }
  </script>
</body>
</html>`;
}
