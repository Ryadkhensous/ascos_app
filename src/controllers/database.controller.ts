import { Request, Response } from 'express';
import { dbStore } from '../services/store';

// Retourne le résumé complet et les données brutes sous forme JSON
export const getDatabaseDump = (_req: Request, res: Response) => {
  try {
    const safeUsers = dbStore.users.map((u) => {
      const { passwordHash, ...safe } = u;
      return safe;
    });

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAthletes: dbStore.athletes.length,
        totalSessions: dbStore.sessions.length,
        totalAttendances: dbStore.attendances.length,
        totalSwimmingTimes: dbStore.swimmingTimes.length,
        totalGroups: dbStore.groups.length,
        totalUsers: dbStore.users.length,
      },
      data: {
        groups: dbStore.groups,
        users: safeUsers,
        athletes: dbStore.athletes,
        sessions: dbStore.sessions,
        attendances: dbStore.attendances,
        swimmingTimes: dbStore.swimmingTimes,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Permet de télécharger le fichier de sauvegarde JSON complet en 1 clic
export const downloadDatabaseBackup = (_req: Request, res: Response) => {
  try {
    const safeUsers = dbStore.users.map((u) => {
      const { passwordHash, ...safe } = u;
      return safe;
    });

    const payload = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      system: 'ASCOS Natation',
      database: {
        groups: dbStore.groups,
        users: safeUsers,
        athletes: dbStore.athletes,
        sessions: dbStore.sessions,
        attendances: dbStore.attendances,
        swimmingTimes: dbStore.swimmingTimes,
      },
    };

    const fileName = `ascos_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Réinitialiser la base de données à zéro en préservant impérativement les comptes ADMIN
export const resetDatabase = (_req: Request, res: Response) => {
  try {
    // 1. Filtrer pour ne conserver QUE les comptes administrateurs
    let admins = dbStore.users.filter((u) => u.role === 'ADMIN');

    // S'il n'y a aucun admin trouvé par précaution, recréer l'admin par défaut
    if (admins.length === 0) {
      admins = [
        {
          id: 'user-admin-1',
          username: 'admin',
          email: 'admin@ascos.fr',
          passwordHash: '$2a$10$UwI7S1UeFWfIFc2ObbEy7eOP14J.txnNDmDIgBJndesbrGtnRoReq',
          firstName: 'Administrateur',
          lastName: 'ASCOS',
          role: 'ADMIN',
          phone: '+33 1 23 45 67 89',
          assignedGroup: 'Tous les groupes',
          assignedGroups: ['Tous les groupes'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    // 2. Vider toutes les collections de données opérationnelles
    dbStore.athletes = [];
    dbStore.sessions = [];
    dbStore.attendances = [];
    dbStore.swimmingTimes = [];
    dbStore.users = admins;

    // 3. Réinitialiser les 4 groupes officiels de base
    dbStore.groups = [
      {
        id: 'grp-elite',
        name: 'Groupe Élite',
        description: 'Nageurs de niveau national et international',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'grp-perf',
        name: 'Groupe Performance',
        description: 'Nageurs régionaux et interrégionaux',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'grp-espoirs',
        name: 'Groupe Espoirs',
        description: 'Jeunes talents en perfectionnement technique',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'grp-ecole',
        name: 'École de Natation',
        description: 'Apprentissage et validation Sauv\'nage',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 4. Sauvegarder sur disque
    dbStore.saveToFile();

    console.log(`🧹 Base de données réinitialisée à zéro. ${admins.length} compte(s) administrateur conservé(s).`);

    return res.json({
      success: true,
      message: 'Base de données réinitialisée à zéro avec succès. Le compte Administrateur a été conservé.',
      adminCount: admins.length,
      admins: admins.map((a) => ({ username: a.username, email: a.email, firstName: a.firstName, lastName: a.lastName })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Interface Web visuelle pour consulter la base de données directement dans le navigateur
export const renderDatabaseViewer = (_req: Request, res: Response) => {
  const safeUsers = dbStore.users.map((u) => {
    const { passwordHash, ...safe } = u;
    return safe;
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A.S.C.O.S - Explorateur de Base de Données</title>
  <style>
    :root {
      --bg: #0A192F;
      --card: #112240;
      --card-inner: #1E3A8A26;
      --border: #334155;
      --cyan: #00E5FF;
      --gold: #FFB300;
      --green: #10B981;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem 1.5rem; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .title-group h1 { font-size: 1.8rem; color: var(--cyan); display: flex; align-items: center; gap: 0.5rem; }
    .title-group p { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.2rem; }
    .actions { display: flex; gap: 0.8rem; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none; cursor: pointer; border: none; transition: 0.2s; }
    .btn-primary { background: var(--cyan); color: #0A192F; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary { background: var(--card); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { border-color: var(--cyan); }
    .btn-danger { background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.4); }
    .btn-danger:hover { background: #EF4444; color: #FFFFFF; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; text-align: center; }
    .stat-val { font-size: 2rem; font-weight: 800; color: var(--cyan); margin-bottom: 0.2rem; }
    .stat-lbl { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1.5rem; overflow-x: auto; }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 0.8rem 1.4rem; font-weight: 600; font-size: 0.95rem; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: var(--cyan); border-bottom-color: var(--cyan); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .table-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
    th { background: rgba(0,0,0,0.2); padding: 0.9rem 1rem; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid rgba(51, 65, 85, 0.4); }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }
    .badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; background: var(--card-inner); border: 1px solid var(--border); }
    .badge-cyan { color: var(--cyan); border-color: rgba(0,229,255,0.3); }
    .badge-green { color: var(--green); border-color: rgba(16,185,129,0.3); }
    .badge-gold { color: var(--gold); border-color: rgba(255,179,0,0.3); }
    .empty-state { padding: 3rem; text-align: center; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1>🏊 ASCOS Natation &bull; Base de Données</h1>
        <p>Hébergée en direct sur Render Cloud &bull; Données temps réel</p>
      </div>
      <div class="actions">
        <a href="/api/database/backup.json" class="btn btn-primary" download>📥 Télécharger la Sauvegarde (.json)</a>
        <a href="/api/database/dump" class="btn btn-secondary" target="_blank">🔍 Voir JSON Brut</a>
        <button onclick="handleResetDb()" class="btn btn-danger">⚠️ Réinitialiser la BD à 0</button>
      </div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-val">${dbStore.athletes.length}</div>
        <div class="stat-lbl">Nageurs</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${dbStore.sessions.length}</div>
        <div class="stat-lbl">Séances</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${dbStore.attendances.length}</div>
        <div class="stat-lbl">Pointages</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${dbStore.swimmingTimes.length}</div>
        <div class="stat-lbl">Chronos & Records</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${dbStore.groups.length}</div>
        <div class="stat-lbl">Groupes</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${dbStore.users.length}</div>
        <div class="stat-lbl">Utilisateurs / Coachs</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="openTab(event, 'tab-athletes')">👥 Nageurs (${dbStore.athletes.length})</button>
      <button class="tab-btn" onclick="openTab(event, 'tab-sessions')">📅 Séances (${dbStore.sessions.length})</button>
      <button class="tab-btn" onclick="openTab(event, 'tab-times')">⏱️ Chronos (${dbStore.swimmingTimes.length})</button>
      <button class="tab-btn" onclick="openTab(event, 'tab-groups')">🏊 Groupes (${dbStore.groups.length})</button>
      <button class="tab-btn" onclick="openTab(event, 'tab-users')">👤 Comptes (${dbStore.users.length})</button>
    </div>

    <!-- ONGLET NAGEURS -->
    <div id="tab-athletes" class="tab-content active">
      <div class="table-card">
        ${
          dbStore.athletes.length === 0
            ? '<div class="empty-state">Aucun nageur enregistré dans la base de données.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Nom & Prénom</th>
                <th>Groupe</th>
                <th>Catégorie</th>
                <th>Licence FFN</th>
                <th>Date Naiss.</th>
                <th>Assiduité</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.athletes
                .map(
                  (a) => `<tr>
                <td style="font-weight: bold; color: #fff;">${a.firstName} ${a.lastName}</td>
                <td><span class="badge badge-cyan">${a.groupName}</span></td>
                <td>${a.category || '-'}</td>
                <td><code>${a.licenseNumber || '-'}</code></td>
                <td>${a.dateOfBirth || '-'}</td>
                <td><span class="badge badge-green">${a.attendanceRate || 100}%</span></td>
              </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET SÉANCES -->
    <div id="tab-sessions" class="tab-content">
      <div class="table-card">
        ${
          dbStore.sessions.length === 0
            ? '<div class="empty-state">Aucune séance enregistrée.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Groupe</th>
                <th>Date</th>
                <th>Horaires</th>
                <th>Bassin</th>
                <th>Lieu</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.sessions
                .map(
                  (s) => `<tr>
                <td style="font-weight: bold; color: #fff;">${s.title}</td>
                <td><span class="badge badge-cyan">${s.groupName}</span></td>
                <td>${s.date}</td>
                <td>${s.startTime} - ${s.endTime}</td>
                <td>${s.poolType === 'POOL_50M' ? '50m Olympique' : '25m Entraînement'}</td>
                <td>${s.location || '-'}</td>
              </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET CHRONOS -->
    <div id="tab-times" class="tab-content">
      <div class="table-card">
        ${
          dbStore.swimmingTimes.length === 0
            ? '<div class="empty-state">Aucun chronomètre enregistré pour le moment.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Nageur</th>
                <th>Épreuve</th>
                <th>Temps</th>
                <th>Bassin</th>
                <th>Compétition</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.swimmingTimes
                .map(
                  (t) => `<tr>
                <td style="font-weight: bold; color: #fff;">${t.athleteName}</td>
                <td>${t.distance}m ${t.stroke}</td>
                <td style="font-family: monospace; font-weight: bold; color: var(--cyan);">${(t.timeInMs / 1000).toFixed(2)}s</td>
                <td>${t.poolType}</td>
                <td><span class="badge ${t.isPersonalBest ? 'badge-gold' : 'badge-cyan'}">${t.competition || 'Entraînement'}</span></td>
                <td>${t.date}</td>
              </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET GROUPES -->
    <div id="tab-groups" class="tab-content">
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom du Groupe</th>
              <th>Description</th>
              <th>Entraîneur Référent</th>
            </tr>
          </thead>
          <tbody>
            ${dbStore.groups
              .map(
                (g) => `<tr>
              <td style="font-weight: bold; color: var(--cyan);">${g.name}</td>
              <td>${g.description || '-'}</td>
              <td>${g.coachName || 'Tous les coachs'}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ONGLET COMPTES -->
    <div id="tab-users" class="tab-content">
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom & Prénom</th>
              <th>Identifiant</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Groupes Assignés</th>
            </tr>
          </thead>
          <tbody>
            ${safeUsers
              .map(
                (u) => `<tr>
              <td style="font-weight: bold; color: #fff;">${u.firstName} ${u.lastName}</td>
              <td><code>${u.username || '-'}</code></td>
              <td>${u.email || '-'}</td>
              <td><span class="badge ${u.role === 'ADMIN' ? 'badge-gold' : 'badge-cyan'}">${u.role}</span></td>
              <td>${(u.assignedGroups || [u.assignedGroup || 'Tous les groupes']).join(', ')}</td>
            </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <footer style="margin-top: 3rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
      ASCOS Natation Cloud Database &bull; Synchronisation automatique avec l'application mobile Flutter
    </footer>
  </div>

  <script>
    function openTab(evt, tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      evt.currentTarget.classList.add('active');
    }

    async function handleResetDb() {
      const confirmFirst = confirm("⚠️ ATTENTION : Vous êtes sur le point de réinitialiser la base de données à zéro.\\n\\n• Tous les nageurs, séances, présences et chronomètres seront supprimés.\\n• LE COMPTE ADMINISTRATEUR SERA TOUJOURS CONSERVÉ.\\n\\nSouhaitez-vous continuer ?");
      if (!confirmFirst) return;

      const confirmSecond = prompt("Pour confirmer cette opération irréversible, tapez le mot 'RESET' en majuscules ci-dessous :");
      if (confirmSecond !== 'RESET') {
        alert("Opération annulée. Le mot 'RESET' n'a pas été saisi.");
        return;
      }

      try {
        const res = await fetch('/api/database/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          alert("✅ " + data.message);
          window.location.reload();
        } else {
          alert("❌ Erreur : " + (data.message || 'Impossible de réinitialiser la base'));
        }
      } catch (err) {
        alert("❌ Erreur de connexion avec le serveur : " + err.message);
      }
    }
  </script>
</body>
</html>`;

  return res.send(html);
};
