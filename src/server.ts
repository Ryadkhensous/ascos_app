import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// Logger de requêtes
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Page HTML de documentation et test interactif
const renderApiDocsHtml = () => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASCOS Natation - API REST & Documentation</title>
  <style>
    :root {
      --bg-primary: #0A192F;
      --bg-surface: #112240;
      --bg-card: #1E3A8A22;
      --primary: #00E5FF;
      --primary-hover: #33EBFF;
      --text-main: #F1F5F9;
      --text-muted: #94A3B8;
      --border: #334155;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --method-get: #10B981;
      --method-post: #00E5FF;
      --method-put: #F59E0B;
      --method-delete: #EF4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-primary); color: var(--text-main); padding: 2rem 1rem; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border); }
    .logo { font-size: 2.5rem; font-weight: 800; color: var(--primary); letter-spacing: 1px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
    .subtitle { color: var(--text-muted); font-size: 1.1rem; margin-top: 0.5rem; }
    .badge-status { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(16, 185, 129, 0.15); color: var(--success); padding: 0.25rem 0.8rem; border-radius: 9999px; font-weight: 600; font-size: 0.85rem; margin-top: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.3); }
    .pulse { width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 8px var(--success); }
    .section-title { font-size: 1.4rem; color: var(--primary); margin: 2rem 0 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 1.5rem; }
    .endpoint { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(51, 65, 85, 0.5); text-decoration: none; color: inherit; transition: background 0.2s; }
    .endpoint:last-child { border-bottom: none; }
    .endpoint:hover { background: rgba(0, 229, 255, 0.05); }
    .endpoint-left { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .method { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 6px; min-width: 60px; text-align: center; }
    .method-GET { background: rgba(16, 185, 129, 0.2); color: var(--method-get); border: 1px solid var(--method-get); }
    .method-POST { background: rgba(0, 229, 255, 0.2); color: var(--method-post); border: 1px solid var(--method-post); }
    .method-PUT { background: rgba(245, 158, 11, 0.2); color: var(--method-put); border: 1px solid var(--method-put); }
    .method-DELETE { background: rgba(239, 68, 68, 0.2); color: var(--method-delete); border: 1px solid var(--method-delete); }
    .path { font-family: monospace; font-size: 0.95rem; font-weight: 600; color: #E2E8F0; }
    .desc { color: var(--text-muted); font-size: 0.85rem; }
    .test-btn { background: rgba(0, 229, 255, 0.1); color: var(--primary); border: 1px solid var(--primary); padding: 0.35rem 0.8rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-decoration: none; transition: 0.2s; }
    .test-btn:hover { background: var(--primary); color: #000; }
    footer { text-align: center; margin-top: 3rem; color: var(--text-muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">🏊 ASCOS NATATION API</div>
      <p class="subtitle">API REST officielle pour la gestion du club, le pointage de présence et le suivi des chronos</p>
      <div class="badge-status"><span class="pulse"></span> Serveur en ligne &bull; Port ${PORT}</div>
    </header>

    <div class="section-title">📊 Tableau de bord & Statistiques</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/stats/dashboard</span>
          <span class="desc">Synthèse complète (effectif, taux assiduité, records récents, prochaine séance)</span>
        </div>
        <a href="/api/stats/dashboard" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
    </div>

    <div class="section-title">🏊 Groupes d'entraînement</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/groups</span>
          <span class="desc">Liste des groupes (Élite, Performance, Espoirs, École de Natation) avec statistiques</span>
        </div>
        <a href="/api/groups" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/groups</span>
          <span class="desc">Créer un nouveau groupe d'entraînement</span>
        </div>
      </div>
    </div>

    <div class="section-title">👥 Athlètes & Nageurs</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/athletes</span>
          <span class="desc">Liste des athlètes filtrables (?group, ?category, ?search)</span>
        </div>
        <a href="/api/athletes" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/athletes/ath-1</span>
          <span class="desc">Fiche complète d'un athlète avec tous ses chronos, PBs et assiduité</span>
        </div>
        <a href="/api/athletes/ath-1" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/athletes</span>
          <span class="desc">Ajouter un nouveau nageur au club</span>
        </div>
      </div>
    </div>

    <div class="section-title">📅 Séances d'entraînement</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/sessions</span>
          <span class="desc">Liste ordonnée des séances du club</span>
        </div>
        <a href="/api/sessions" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/sessions/sess-1</span>
          <span class="desc">Détail d'une séance avec feuille d'émargement générée</span>
        </div>
        <a href="/api/sessions/sess-1" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/sessions</span>
          <span class="desc">Programmer une nouvelle séance</span>
        </div>
      </div>
    </div>

    <div class="section-title">📋 Feuille d'appel & Présences</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/attendance/stats</span>
          <span class="desc">Statistiques globales de présence et d'absence du club</span>
        </div>
        <a href="/api/attendance/stats" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/attendance/history</span>
          <span class="desc">Historique complet des pointages par date</span>
        </div>
        <a href="/api/attendance/history" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/attendance/export/csv</span>
          <span class="desc">Télécharger le fichier CSV complet compatible Excel UTF-8</span>
        </div>
        <a href="/api/attendance/export/csv" target="_blank" class="test-btn">Télécharger CSV &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/attendance/batch</span>
          <span class="desc">Sauvegarde en 1 tap de la feuille d'appel du bassin</span>
        </div>
      </div>
    </div>

    <div class="section-title">⏱️ Chronomètres & Records Club (PBs)</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/times/records</span>
          <span class="desc">Tableau d'honneur des records du club</span>
        </div>
        <a href="/api/times/records" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-GET">GET</span>
          <span class="path">/api/times/athlete/ath-1</span>
          <span class="desc">Historique des chronos d'un nageur pour les graphiques de progression</span>
        </div>
        <a href="/api/times/athlete/ath-1" target="_blank" class="test-btn">Tester &rarr;</a>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/times</span>
          <span class="desc">Enregistrer un chrono (détecte automatiquement si c'est un record personnel)</span>
        </div>
      </div>
    </div>

    <div class="section-title">🔐 Authentification</div>
    <div class="card">
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/auth/login</span>
          <span class="desc">Connexion entraîneur / administrateur</span>
        </div>
      </div>
      <div class="endpoint">
        <div class="endpoint-left">
          <span class="method method-POST">POST</span>
          <span class="path">/api/auth/register</span>
          <span class="desc">Créer un nouveau compte coach / admin</span>
        </div>
      </div>
    </div>

    <footer>
      &copy; 2026 ASCOS Natation &bull; Application Mobile Flutter & API REST Node.js TypeScript
    </footer>
  </div>
</body>
</html>`;

// Route d'accueil & documentation
app.get(['/', '/api/docs'], (req: Request, res: Response) => {
  if (req.accepts('html')) {
    return res.send(renderApiDocsHtml());
  }

  return res.json({
    status: 'online',
    project: 'ASCOS Natation API',
    version: '1.0.0',
    description: 'API de suivi des athlètes de natation, assiduité et chronomètres',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me',
      },
      groups: 'GET /api/groups',
      athletes: 'GET /api/athletes',
      sessions: 'GET /api/sessions',
      attendance: {
        stats: 'GET /api/attendance/stats',
        history: 'GET /api/attendance/history',
        batch: 'POST /api/attendance/batch',
        exportCsv: 'GET /api/attendance/export/csv',
      },
      times: {
        all: 'GET /api/times',
        records: 'GET /api/times/records',
        recordNew: 'POST /api/times',
      },
      dashboard: 'GET /api/stats/dashboard',
    },
  });
});

// Montage des routes API
app.use('/api', apiRoutes);

// Middleware 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} introuvable sur le serveur ASCOS API`,
  });
});

// Middleware d'erreur global
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Erreur non gérée :', err);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Démarrage du serveur
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log('🏊 =========================================');
  console.log(`🚀 Serveur ASCOS API démarré sur port ${PORT} :`);
  console.log(`   👉 PC / Web / Bureau : http://localhost:${PORT}/api`);
  console.log(`   👉 Émulateur Android : http://10.0.2.2:${PORT}/api`);
  console.log(`   👉 Réseau Wi-Fi      : http://0.0.0.0:${PORT}/api`);
  console.log(`📑 Documentation & DB : http://localhost:${PORT}/api/docs`);
  console.log(`📊 Mode : ${process.env.NODE_ENV || 'development'}`);
  console.log('🏊 =========================================');
});

export default app;
