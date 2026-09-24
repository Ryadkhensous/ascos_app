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

// Permet de restaurer la base de données à partir d'un fichier de sauvegarde JSON
export const restoreDatabaseBackup = (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const db = payload.database || payload.data || payload;

    if (Array.isArray(db.athletes)) dbStore.athletes = db.athletes;
    if (Array.isArray(db.sessions)) dbStore.sessions = db.sessions;
    if (Array.isArray(db.attendances)) dbStore.attendances = db.attendances;
    if (Array.isArray(db.swimmingTimes)) dbStore.swimmingTimes = db.swimmingTimes;
    if (Array.isArray(db.groups) && db.groups.length > 0) dbStore.groups = db.groups;
    if (Array.isArray(db.users) && db.users.length > 0) {
      const existingAdmins = dbStore.users.filter((u) => u.role === 'ADMIN');
      dbStore.users = db.users;
      // S'assurer de conserver au moins un compte admin
      for (const admin of existingAdmins) {
        if (!dbStore.users.some((u) => u.id === admin.id || u.email === admin.email)) {
          dbStore.users.unshift(admin);
        }
      }
    }

    dbStore.saveToFile();
    console.log(`📥 Base de données restaurée avec succès (${dbStore.athletes.length} athlètes, ${dbStore.sessions.length} séances).`);

    return res.json({
      success: true,
      message: `Sauvegarde restaurée avec succès ! (${dbStore.athletes.length} athlètes, ${dbStore.sessions.length} séances, ${dbStore.users.length} comptes)`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Erreur lors de la restauration : ' + error.message });
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

  const allGroupNames = [
    'Tous les groupes',
    ...Array.from(new Set(dbStore.groups.map((g) => g.name))),
  ];

  const clubGroupsOnly = dbStore.groups.map((g) => g.name);

  const coachesAndAdmins = dbStore.users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    role: u.role,
  }));

  const escapeQuote = (str: string) => (str || '').replace(/'/g, "\\'");

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
    .container { max-width: 1240px; margin: 0 auto; }
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

    /* En-têtes d'onglets & boutons d'action */
    .tab-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; flex-wrap: wrap; gap: 1rem; }
    .tab-header-bar h2 { font-size: 1.2rem; color: #fff; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
    .tab-header-bar p { color: var(--text-muted); font-size: 0.85rem; margin: 0.2rem 0 0; }
    .action-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; text-decoration: none; }
    .action-btn-edit { background: rgba(0, 229, 255, 0.15); color: var(--cyan); border: 1px solid rgba(0, 229, 255, 0.3); }
    .action-btn-edit:hover { background: var(--cyan); color: #0A192F; }
    .action-btn-delete { background: rgba(239, 68, 68, 0.15); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); }
    .action-btn-delete:hover:not(:disabled) { background: #EF4444; color: #fff; }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .actions-cell { display: flex; gap: 0.5rem; align-items: center; }

    /* Modales */
    .modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(10, 25, 47, 0.85); backdrop-filter: blur(6px); z-index: 1000; justify-content: center; align-items: center; padding: 1rem; }
    .modal-backdrop.active { display: flex; }
    .modal-card { background: #112240; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 600px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75); overflow: hidden; animation: modalIn 0.2s ease-out; }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #334155; }
    .modal-header h3 { color: var(--cyan); font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .modal-close { background: transparent; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0.2rem 0.5rem; border-radius: 4px; }
    .modal-close:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .modal-body { padding: 1.5rem; max-height: calc(85vh - 140px); overflow-y: auto; }
    .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 0.8rem; background: rgba(0, 0, 0, 0.2); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group.full { grid-column: span 2; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-control { width: 100%; background: #0A192F; border: 1px solid #334155; border-radius: 8px; padding: 0.65rem 0.9rem; color: #fff; font-size: 0.92rem; outline: none; transition: 0.2s; box-sizing: border-box; }
    .form-control:focus { border-color: var(--cyan); box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.25); }
    .checkbox-group { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.4rem; }
    .checkbox-item { display: flex; align-items: center; gap: 0.6rem; background: rgba(30, 58, 138, 0.15); padding: 0.55rem 0.75rem; border-radius: 6px; border: 1px solid #334155; font-size: 0.85rem; cursor: pointer; user-select: none; }
    .checkbox-item:hover { border-color: var(--cyan); }
    .checkbox-item input { accent-color: var(--cyan); width: 16px; height: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title-group">
        <h1>🏊 ASCOS Natation &bull; Base de Données</h1>
        <p style="margin-top: 0.4rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span>Données en temps réel &bull;</span>
          ${dbStore.isPgConnected
            ? '<span class="badge badge-green">🟢 Base PostgreSQL Cloud Active (Persistance 100%)</span>'
            : '<span class="badge badge-cyan">📁 Stockage Fichier (ascos_store.json)</span>'
          }
        </p>
      </div>
      <div class="actions">
        <a href="/api/database/backup.json" class="btn btn-primary" download>📥 Télécharger la Sauvegarde (.json)</a>
        <input type="file" id="file-restore" accept=".json" style="display:none;" onchange="handleRestoreFile(event)">
        <button class="btn btn-secondary" onclick="document.getElementById('file-restore').click()">📤 Restaurer (.json)</button>
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
      <div class="tab-header-bar">
        <div>
          <h2>👥 Gestion des Nageurs (${dbStore.athletes.length})</h2>
          <p>Créez, modifiez ou supprimez les profils des nageurs et compétiteurs du club</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateAthleteModal()">➕ Ajouter un Nageur</button>
      </div>

      <div class="table-card">
        ${
          dbStore.athletes.length === 0
            ? '<div class="empty-state">Aucun nageur enregistré dans la base de données. Cliquez sur <strong>➕ Ajouter un Nageur</strong> ci-dessus.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Nom & Prénom</th>
                <th>Groupe</th>
                <th>Catégorie</th>
                <th>Licence FFN</th>
                <th>Date Naiss.</th>
                <th>Assiduité</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.athletes
                .map((a) => {
                  const aB64 = Buffer.from(JSON.stringify(a)).toString('base64');
                  return `<tr>
                <td style="font-weight: bold; color: #fff;">${a.firstName} ${a.lastName}</td>
                <td><span class="badge badge-cyan">${a.groupName}</span></td>
                <td>${a.category || '-'}</td>
                <td><code>${a.licenseNumber || '-'}</code></td>
                <td>${a.dateOfBirth || '-'}</td>
                <td><span class="badge badge-green">${a.attendanceRate || 100}%</span></td>
                <td style="text-align: right;">
                  <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-btn action-btn-edit" onclick="openEditAthleteModal('${aB64}')">✏️ Modifier</button>
                    <button class="action-btn action-btn-delete" onclick="handleDeleteAthlete('${a.id}', '${escapeQuote(a.firstName)} ${escapeQuote(a.lastName)}')">🗑️ Supprimer</button>
                  </div>
                </td>
              </tr>`;
                })
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET SÉANCES -->
    <div id="tab-sessions" class="tab-content">
      <div class="tab-header-bar">
        <div>
          <h2>📅 Gestion des Séances (${dbStore.sessions.length})</h2>
          <p>Programmez, modifiez ou supprimez les entraînements et créneaux du club</p>
        </div>
        <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="handleGenerateDailySessions()">⚡ Générer Séances du Jour</button>
          <button class="btn btn-primary" onclick="openCreateSessionModal()">➕ Programmer une Séance</button>
        </div>
      </div>

      <div class="table-card">
        ${
          dbStore.sessions.length === 0
            ? '<div class="empty-state">Aucune séance enregistrée. Cliquez sur <strong>➕ Programmer une Séance</strong> ou <strong>⚡ Générer Séances du Jour</strong>.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Groupe</th>
                <th>Date</th>
                <th>Horaires</th>
                <th>Bassin</th>
                <th>Lieu</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.sessions
                .map((s) => {
                  const sB64 = Buffer.from(JSON.stringify(s)).toString('base64');
                  return `<tr>
                <td style="font-weight: bold; color: #fff;">${s.title}</td>
                <td><span class="badge badge-cyan">${s.groupName}</span></td>
                <td>${s.date}</td>
                <td>${s.startTime} - ${s.endTime}</td>
                <td>${s.poolType === 'POOL_50M' ? '50m Olympique' : '25m Entraînement'}</td>
                <td>${s.location || '-'}</td>
                <td style="text-align: right;">
                  <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-btn action-btn-edit" onclick="openEditSessionModal('${sB64}')">✏️ Modifier</button>
                    <button class="action-btn action-btn-delete" onclick="handleDeleteSession('${s.id}', '${escapeQuote(s.title)}')">🗑️ Supprimer</button>
                  </div>
                </td>
              </tr>`;
                })
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET CHRONOS -->
    <div id="tab-times" class="tab-content">
      <div class="tab-header-bar">
        <div>
          <h2>⏱️ Chronomètres & Performances (${dbStore.swimmingTimes.length})</h2>
          <p>Enregistrez, modifiez ou supprimez les temps réalisés en compétition et entraînement</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateTimeModal()">➕ Enregistrer un Chrono</button>
      </div>

      <div class="table-card">
        ${
          dbStore.swimmingTimes.length === 0
            ? '<div class="empty-state">Aucun chronomètre enregistré pour le moment. Cliquez sur <strong>➕ Enregistrer un Chrono</strong> ci-dessus.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Nageur</th>
                <th>Épreuve</th>
                <th>Temps</th>
                <th>Bassin</th>
                <th>Compétition</th>
                <th>Date</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.swimmingTimes
                .map((t) => {
                  const tB64 = Buffer.from(JSON.stringify(t)).toString('base64');
                  return `<tr>
                <td style="font-weight: bold; color: #fff;">${t.athleteName}</td>
                <td>${t.distance}m ${t.stroke}</td>
                <td style="font-family: monospace; font-weight: bold; color: var(--cyan);">${(t.timeInMs / 1000).toFixed(2)}s</td>
                <td>${t.poolType === 'POOL_50M' ? '50m' : '25m'}</td>
                <td><span class="badge ${t.isPersonalBest ? 'badge-gold' : 'badge-cyan'}">${t.competition || 'Entraînement'}</span></td>
                <td>${t.date}</td>
                <td style="text-align: right;">
                  <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-btn action-btn-edit" onclick="openEditTimeModal('${tB64}')">✏️ Modifier</button>
                    <button class="action-btn action-btn-delete" onclick="handleDeleteTime('${t.id}', '${escapeQuote(t.athleteName)}')">🗑️ Supprimer</button>
                  </div>
                </td>
              </tr>`;
                })
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET GROUPES -->
    <div id="tab-groups" class="tab-content">
      <div class="tab-header-bar">
        <div>
          <h2>🏊 Groupes d'Entraînement (${dbStore.groups.length})</h2>
          <p>Gérez les sections sportives et catégories d'entraînement du club</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateGroupModal()">➕ Nouveau Groupe</button>
      </div>

      <div class="table-card">
        ${
          dbStore.groups.length === 0
            ? '<div class="empty-state">Aucun groupe enregistré. Cliquez sur <strong>➕ Nouveau Groupe</strong> ci-dessus.</div>'
            : `<table>
            <thead>
              <tr>
                <th>Nom du Groupe</th>
                <th>Description</th>
                <th>Entraîneur Référent</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dbStore.groups
                .map((g) => {
                  const gB64 = Buffer.from(JSON.stringify(g)).toString('base64');
                  return `<tr>
                <td style="font-weight: bold; color: var(--cyan);">${g.name}</td>
                <td>${g.description || '-'}</td>
                <td>${g.coachName || 'Tous les coachs'}</td>
                <td style="text-align: right;">
                  <div class="actions-cell" style="justify-content: flex-end;">
                    <button class="action-btn action-btn-edit" onclick="openEditGroupModal('${gB64}')">✏️ Modifier</button>
                    <button class="action-btn action-btn-delete" onclick="handleDeleteGroup('${g.id}', '${escapeQuote(g.name)}')">🗑️ Supprimer</button>
                  </div>
                </td>
              </tr>`;
                })
                .join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>

    <!-- ONGLET COMPTES -->
    <div id="tab-users" class="tab-content">
      <div class="tab-header-bar">
        <div>
          <h2>👤 Gestion des Comptes (Entraîneurs & Administrateurs)</h2>
          <p>Créez, modifiez ou supprimez les accès des coachs et administrateurs du club</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateUserModal()">➕ Ajouter un Compte</button>
      </div>

      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th>Nom & Prénom</th>
              <th>Identifiant</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th>Rôle</th>
              <th>Groupes Assignés</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${safeUsers
              .map((u) => {
                const uB64 = Buffer.from(JSON.stringify(u)).toString('base64');
                const isLastAdmin = u.role === 'ADMIN' && safeUsers.filter((x) => x.role === 'ADMIN').length <= 1;
                return `<tr>
            <td style="font-weight: bold; color: #fff;">${u.firstName} ${u.lastName}</td>
            <td><code>${u.username || '-'}</code></td>
            <td>${u.email || '-'}</td>
            <td>${u.phone || '-'}</td>
            <td><span class="badge ${u.role === 'ADMIN' ? 'badge-gold' : 'badge-cyan'}">${u.role}</span></td>
            <td>${(u.assignedGroups || [u.assignedGroup || 'Tous les groupes']).join(', ')}</td>
            <td style="text-align: right;">
              <div class="actions-cell" style="justify-content: flex-end;">
                <button class="action-btn action-btn-edit" onclick="openEditUserModal('${uB64}')">✏️ Modifier</button>
                <button class="action-btn action-btn-delete" onclick="handleDeleteUser('${u.id}', '${escapeQuote(u.firstName)} ${escapeQuote(u.lastName)}', '${u.role}')" ${isLastAdmin ? 'disabled title="Dernier compte administrateur non supprimable"' : ''}>🗑️ Supprimer</button>
              </div>
            </td>
          </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <footer style="margin-top: 3rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
      ASCOS Natation Cloud Database &bull; Synchronisation automatique avec l'application mobile Flutter
    </footer>
  </div>

  <!-- ==================== MODALES NAGEURS ==================== -->
  <!-- Modale Création Nageur -->
  <div id="modal-create-athlete" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>➕ Ajouter un Nageur</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-create-athlete" onsubmit="submitCreateAthlete(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Prénom *</label>
              <input type="text" id="create-ath-firstName" class="form-control" placeholder="ex: Léon" required>
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input type="text" id="create-ath-lastName" class="form-control" placeholder="ex: Marchand" required>
            </div>
            <div class="form-group">
              <label>Date de Naissance *</label>
              <input type="date" id="create-ath-dob" class="form-control" required value="2008-01-01">
            </div>
            <div class="form-group">
              <label>Sexe *</label>
              <select id="create-ath-gender" class="form-control" required>
                <option value="MALE">Masculin (M)</option>
                <option value="FEMALE">Féminin (F)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Groupe Sportif *</label>
              <select id="create-ath-group" class="form-control" required>
                ${(clubGroupsOnly.length > 0 ? clubGroupsOnly : ['Groupe Élite', 'Groupe Performance'])
                  .map((g) => `<option value="${g}">${g}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Catégorie (optionnel)</label>
              <select id="create-ath-category" class="form-control">
                <option value="">-- Calcul automatique selon l'âge --</option>
                <option value="Avenirs (< 11 ans)">Avenirs (&lt; 11 ans)</option>
                <option value="Jeunes (11-14 ans)">Jeunes (11-14 ans)</option>
                <option value="Juniors (15-18 ans)">Juniors (15-18 ans)</option>
                <option value="Séniors & Maîtres (19+ ans)">Séniors &amp; Maîtres (19+ ans)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Numéro Licence FFN</label>
              <input type="text" id="create-ath-license" class="form-control" placeholder="ex: FFN-842105">
            </div>
            <div class="form-group">
              <label>Contact Urgence / Parent</label>
              <input type="text" id="create-ath-emergency" class="form-control" placeholder="ex: +33 6 11 22 33 44">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-create-ath">Ajouter le Nageur</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modale Modification Nageur -->
  <div id="modal-edit-athlete" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>✏️ Modifier le Profil du Nageur</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-edit-athlete" onsubmit="submitEditAthlete(event)">
        <input type="hidden" id="edit-ath-id">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Prénom *</label>
              <input type="text" id="edit-ath-firstName" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input type="text" id="edit-ath-lastName" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Date de Naissance *</label>
              <input type="date" id="edit-ath-dob" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Sexe *</label>
              <select id="edit-ath-gender" class="form-control" required>
                <option value="MALE">Masculin (M)</option>
                <option value="FEMALE">Féminin (F)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Groupe Sportif *</label>
              <select id="edit-ath-group" class="form-control" required>
                ${(clubGroupsOnly.length > 0 ? clubGroupsOnly : ['Groupe Élite', 'Groupe Performance'])
                  .map((g) => `<option value="${g}">${g}</option>`)
                  .join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Catégorie</label>
              <select id="edit-ath-category" class="form-control">
                <option value="">-- Calcul automatique selon l'âge --</option>
                <option value="Avenirs (< 11 ans)">Avenirs (&lt; 11 ans)</option>
                <option value="Jeunes (11-14 ans)">Jeunes (11-14 ans)</option>
                <option value="Juniors (15-18 ans)">Juniors (15-18 ans)</option>
                <option value="Séniors & Maîtres (19+ ans)">Séniors &amp; Maîtres (19+ ans)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Numéro Licence FFN</label>
              <input type="text" id="edit-ath-license" class="form-control">
            </div>
            <div class="form-group">
              <label>Contact Urgence / Parent</label>
              <input type="text" id="edit-ath-emergency" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-ath">Enregistrer les Modifications</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODALES SÉANCES ==================== -->
  <!-- Modale Création Séance -->
  <div id="modal-create-session" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>➕ Programmer une Séance</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-create-session" onsubmit="submitCreateSession(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Titre de la Séance *</label>
              <input type="text" id="create-sess-title" class="form-control" placeholder="ex: Aérobie & Vitesse Compétition" required>
            </div>
            <div class="form-group">
              <label>Groupe Concerné *</label>
              <select id="create-sess-group" class="form-control" required>
                ${allGroupNames.map((g) => `<option value="${g}">${g}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date de la Séance *</label>
              <input type="date" id="create-sess-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Heure Début *</label>
              <input type="time" id="create-sess-startTime" class="form-control" value="18:00" required>
            </div>
            <div class="form-group">
              <label>Heure Fin *</label>
              <input type="time" id="create-sess-endTime" class="form-control" value="20:00" required>
            </div>
            <div class="form-group">
              <label>Type de Bassin *</label>
              <select id="create-sess-poolType" class="form-control" required>
                <option value="POOL_25M">25m Entraînement</option>
                <option value="POOL_50M">50m Olympique</option>
              </select>
            </div>
            <div class="form-group">
              <label>Lieu / Piscine</label>
              <input type="text" id="create-sess-location" class="form-control" placeholder="ex: Bassin Olympique (50m)">
            </div>
            <div class="form-group full">
              <label>Objectif / Thématique</label>
              <input type="text" id="create-sess-focus" class="form-control" placeholder="ex: Cadences, Virages & Chronos Officiels">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-create-sess">Créer la Séance</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modale Modification Séance -->
  <div id="modal-edit-session" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>✏️ Modifier la Séance</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-edit-session" onsubmit="submitEditSession(event)">
        <input type="hidden" id="edit-sess-id">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Titre de la Séance *</label>
              <input type="text" id="edit-sess-title" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Groupe Concerné *</label>
              <select id="edit-sess-group" class="form-control" required>
                ${allGroupNames.map((g) => `<option value="${g}">${g}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date de la Séance *</label>
              <input type="date" id="edit-sess-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Heure Début *</label>
              <input type="time" id="edit-sess-startTime" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Heure Fin *</label>
              <input type="time" id="edit-sess-endTime" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Type de Bassin *</label>
              <select id="edit-sess-poolType" class="form-control" required>
                <option value="POOL_25M">25m Entraînement</option>
                <option value="POOL_50M">50m Olympique</option>
              </select>
            </div>
            <div class="form-group">
              <label>Lieu / Piscine</label>
              <input type="text" id="edit-sess-location" class="form-control">
            </div>
            <div class="form-group full">
              <label>Objectif / Thématique</label>
              <input type="text" id="edit-sess-focus" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-sess">Enregistrer les Modifications</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODALES CHRONOS ==================== -->
  <!-- Modale Création Chrono -->
  <div id="modal-create-time" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>⏱️ Enregistrer un Chronomètre</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-create-time" onsubmit="submitCreateTime(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nageur *</label>
              <select id="create-time-athleteId" class="form-control" required>
                ${
                  dbStore.athletes.length === 0
                    ? '<option value="" disabled selected>Aucun nageur disponible - Créez d\'abord un nageur</option>'
                    : dbStore.athletes
                        .map((a) => `<option value="${a.id}">${a.firstName} ${a.lastName} (${a.groupName})</option>`)
                        .join('')
                }
              </select>
            </div>
            <div class="form-group">
              <label>Nage / Style *</label>
              <select id="create-time-stroke" class="form-control" required>
                <option value="Nage Libre" selected>Nage Libre</option>
                <option value="Dos">Dos</option>
                <option value="Brasse">Brasse</option>
                <option value="Papillon">Papillon</option>
                <option value="4 Nages">4 Nages</option>
              </select>
            </div>
            <div class="form-group">
              <label>Distance *</label>
              <select id="create-time-distance" class="form-control" required>
                <option value="50" selected>50m</option>
                <option value="100">100m</option>
                <option value="200">200m</option>
                <option value="400">400m</option>
                <option value="800">800m</option>
                <option value="1500">1500m</option>
              </select>
            </div>
            <div class="form-group">
              <label>Temps en secondes (ex: 24.50 ou 58.12) *</label>
              <input type="number" step="0.01" min="1" id="create-time-seconds" class="form-control" placeholder="ex: 24.50" required>
            </div>
            <div class="form-group">
              <label>Type de Bassin *</label>
              <select id="create-time-poolType" class="form-control" required>
                <option value="POOL_25M" selected>25m</option>
                <option value="POOL_50M">50m (Olympique)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date de Réalisation *</label>
              <input type="date" id="create-time-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Compétition / Événement</label>
              <input type="text" id="create-time-competition" class="form-control" placeholder="ex: Entraînement chronométré" value="Entraînement chronométré">
            </div>
            <div class="form-group full">
              <label>Remarques / Notes de course (optionnel)</label>
              <input type="text" id="create-time-notes" class="form-control" placeholder="ex: Départ plongeon parfait, virage rapide">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-create-time">Enregistrer le Chrono</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modale Modification Chrono -->
  <div id="modal-edit-time" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>✏️ Modifier le Chronomètre</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-edit-time" onsubmit="submitEditTime(event)">
        <input type="hidden" id="edit-time-id">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nageur *</label>
              <select id="edit-time-athleteId" class="form-control" required>
                ${dbStore.athletes
                  .map((a) => `<option value="${a.id}">${a.firstName} ${a.lastName} (${a.groupName})</option>`)
                  .join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Nage / Style *</label>
              <select id="edit-time-stroke" class="form-control" required>
                <option value="Nage Libre">Nage Libre</option>
                <option value="Dos">Dos</option>
                <option value="Brasse">Brasse</option>
                <option value="Papillon">Papillon</option>
                <option value="4 Nages">4 Nages</option>
              </select>
            </div>
            <div class="form-group">
              <label>Distance *</label>
              <select id="edit-time-distance" class="form-control" required>
                <option value="50">50m</option>
                <option value="100">100m</option>
                <option value="200">200m</option>
                <option value="400">400m</option>
                <option value="800">800m</option>
                <option value="1500">1500m</option>
              </select>
            </div>
            <div class="form-group">
              <label>Temps en secondes *</label>
              <input type="number" step="0.01" min="1" id="edit-time-seconds" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Type de Bassin *</label>
              <select id="edit-time-poolType" class="form-control" required>
                <option value="POOL_25M">25m</option>
                <option value="POOL_50M">50m (Olympique)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date de Réalisation *</label>
              <input type="date" id="edit-time-date" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Compétition / Événement</label>
              <input type="text" id="edit-time-competition" class="form-control">
            </div>
            <div class="form-group full">
              <label>Remarques / Notes de course</label>
              <input type="text" id="edit-time-notes" class="form-control">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-time">Enregistrer les Modifications</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODALES GROUPES ==================== -->
  <!-- Modale Création Groupe -->
  <div id="modal-create-group" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>➕ Créer un Groupe d'Entraînement</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-create-group" onsubmit="submitCreateGroup(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nom du Groupe *</label>
              <input type="text" id="create-grp-name" class="form-control" placeholder="ex: Groupe Masters" required>
            </div>
            <div class="form-group full">
              <label>Description</label>
              <input type="text" id="create-grp-description" class="form-control" placeholder="ex: Perfectionnement adultes et compétitions maîtres">
            </div>
            <div class="form-group full">
              <label>Entraîneur Référent (optionnel)</label>
              <select id="create-grp-coachId" class="form-control">
                <option value="">-- Aucun entraîneur assigné en particulier --</option>
                ${coachesAndAdmins.map((c) => `<option value="${c.id}">${c.name} (${c.role})</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-create-grp">Créer le Groupe</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modale Modification Groupe -->
  <div id="modal-edit-group" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>✏️ Modifier le Groupe</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-edit-group" onsubmit="submitEditGroup(event)">
        <input type="hidden" id="edit-grp-id">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full">
              <label>Nom du Groupe *</label>
              <input type="text" id="edit-grp-name" class="form-control" required>
            </div>
            <div class="form-group full">
              <label>Description</label>
              <input type="text" id="edit-grp-description" class="form-control">
            </div>
            <div class="form-group full">
              <label>Entraîneur Référent</label>
              <select id="edit-grp-coachId" class="form-control">
                <option value="">-- Aucun entraîneur assigné en particulier --</option>
                ${coachesAndAdmins.map((c) => `<option value="${c.id}">${c.name} (${c.role})</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit-grp">Enregistrer les Modifications</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODALES COMPTES ==================== -->
  <!-- MODALE CRÉATION UTILISATEUR -->
  <div id="modal-create-user" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>➕ Ajouter un Compte d'accès</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-create-user" onsubmit="submitCreateUser(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Prénom *</label>
              <input type="text" id="create-firstName" class="form-control" placeholder="ex: Florent" required>
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input type="text" id="create-lastName" class="form-control" placeholder="ex: Manaudou" required>
            </div>
            <div class="form-group">
              <label>Identifiant (Login) *</label>
              <input type="text" id="create-username" class="form-control" placeholder="ex: coach_florent" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="create-email" class="form-control" placeholder="ex: coach@ascos.fr">
            </div>
            <div class="form-group">
              <label>Mot de passe *</label>
              <input type="password" id="create-password" class="form-control" placeholder="Mot de passe" required minlength="4">
            </div>
            <div class="form-group">
              <label>Rôle *</label>
              <select id="create-role" class="form-control" required onchange="onRoleChange('create')">
                <option value="COACH" selected>COACH (Entraîneur)</option>
                <option value="ADMIN">ADMIN (Administrateur)</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Téléphone (optionnel)</label>
              <input type="text" id="create-phone" class="form-control" placeholder="ex: +33 6 12 34 56 78">
            </div>
            <div class="form-group full">
              <label>Groupes Assignés *</label>
              <div class="checkbox-group">
                ${allGroupNames
                  .map(
                    (gn) => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="create-groups" value="${gn}" ${gn === 'Groupe Élite' ? 'checked' : ''}>
                    <span>${gn}</span>
                  </label>`
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-create">Créer le Compte</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODALE MODIFICATION UTILISATEUR -->
  <div id="modal-edit-user" class="modal-backdrop" onclick="if(event.target === this) closeModals()">
    <div class="modal-card">
      <div class="modal-header">
        <h3>✏️ Modifier le Compte</h3>
        <button class="modal-close" onclick="closeModals()">&times;</button>
      </div>
      <form id="form-edit-user" onsubmit="submitEditUser(event)">
        <input type="hidden" id="edit-id">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Prénom *</label>
              <input type="text" id="edit-firstName" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Nom *</label>
              <input type="text" id="edit-lastName" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Identifiant (Login) *</label>
              <input type="text" id="edit-username" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="edit-email" class="form-control">
            </div>
            <div class="form-group">
              <label>Nouveau Mot de passe (optionnel)</label>
              <input type="password" id="edit-password" class="form-control" placeholder="Laisser vide pour ne pas changer">
            </div>
            <div class="form-group">
              <label>Rôle *</label>
              <select id="edit-role" class="form-control" required onchange="onRoleChange('edit')">
                <option value="COACH">COACH (Entraîneur)</option>
                <option value="ADMIN">ADMIN (Administrateur)</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Téléphone</label>
              <input type="text" id="edit-phone" class="form-control">
            </div>
            <div class="form-group full">
              <label>Groupes Assignés *</label>
              <div class="checkbox-group">
                ${allGroupNames
                  .map(
                    (gn) => `
                  <label class="checkbox-item">
                    <input type="checkbox" name="edit-groups" value="${gn}">
                    <span>${gn}</span>
                  </label>`
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Annuler</button>
          <button type="submit" class="btn btn-primary" id="btn-submit-edit">Enregistrer les Modifications</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    // Navigation par onglets
    function openTab(evt, tabId) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });
      var targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.add('active');

      if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
      } else {
        var btn = document.querySelector(".tab-btn[onclick*='" + tabId + "']");
        if (btn) btn.classList.add('active');
      }

      try {
        localStorage.setItem('ascos_active_tab', tabId);
      } catch(_) {}
    }

    // Restaurer l'onglet actif au chargement
    window.addEventListener('DOMContentLoaded', function() {
      try {
        var savedTab = localStorage.getItem('ascos_active_tab');
        if (savedTab && document.getElementById(savedTab)) {
          openTab(null, savedTab);
        }
      } catch(_) {}
    });

    // Fermeture de toutes les modales
    function closeModals() {
      document.querySelectorAll('.modal-backdrop').forEach(function(m) { m.classList.remove('active'); });
    }
    function closeUserModals() {
      closeModals();
    }

    // Fermer avec la touche Échap
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModals();
    });

    // Décodage Base64 sécurisé pour l'UTF-8 (accents français, etc.)
    function decodeB64(b64) {
      try {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch(e) {
        try {
          return JSON.parse(atob(b64));
        } catch(e2) {
          console.error("Erreur de décodage base64 :", e2);
          return null;
        }
      }
    }

    // ==================== GESTION DES NAGEURS ====================
    function openCreateAthleteModal() {
      document.getElementById('form-create-athlete').reset();
      document.getElementById('create-ath-dob').value = '2008-01-01';
      document.getElementById('modal-create-athlete').classList.add('active');
    }

    function openEditAthleteModal(b64) {
      var a = decodeB64(b64);
      if (!a) return;
      document.getElementById('edit-ath-id').value = a.id;
      document.getElementById('edit-ath-firstName').value = a.firstName || '';
      document.getElementById('edit-ath-lastName').value = a.lastName || '';
      document.getElementById('edit-ath-dob').value = a.dateOfBirth || '';
      document.getElementById('edit-ath-gender').value = a.gender || 'MALE';
      document.getElementById('edit-ath-group').value = a.groupName || '';
      document.getElementById('edit-ath-category').value = a.category || '';
      document.getElementById('edit-ath-license').value = a.licenseNumber || '';
      document.getElementById('edit-ath-emergency').value = a.emergencyContact || '';
      document.getElementById('modal-edit-athlete').classList.add('active');
    }

    async function submitCreateAthlete(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-submit-create-ath');
      btn.disabled = true;
      btn.innerText = 'Ajout en cours...';

      var payload = {
        firstName: document.getElementById('create-ath-firstName').value.trim(),
        lastName: document.getElementById('create-ath-lastName').value.trim(),
        dateOfBirth: document.getElementById('create-ath-dob').value,
        gender: document.getElementById('create-ath-gender').value,
        groupName: document.getElementById('create-ath-group').value,
        category: document.getElementById('create-ath-category').value || undefined,
        licenseNumber: document.getElementById('create-ath-license').value.trim() || undefined,
        emergencyContact: document.getElementById('create-ath-emergency').value.trim() || undefined
      };

      try {
        var res = await fetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-athletes');
          alert('✅ Nageur ajouté avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || "Impossible d'ajouter le nageur"));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Ajouter le Nageur';
      }
    }

    async function submitEditAthlete(e) {
      e.preventDefault();
      var id = document.getElementById('edit-ath-id').value;
      var btn = document.getElementById('btn-submit-edit-ath');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var payload = {
        firstName: document.getElementById('edit-ath-firstName').value.trim(),
        lastName: document.getElementById('edit-ath-lastName').value.trim(),
        dateOfBirth: document.getElementById('edit-ath-dob').value,
        gender: document.getElementById('edit-ath-gender').value,
        groupName: document.getElementById('edit-ath-group').value,
        category: document.getElementById('edit-ath-category').value || undefined,
        licenseNumber: document.getElementById('edit-ath-license').value.trim() || undefined,
        emergencyContact: document.getElementById('edit-ath-emergency').value.trim() || undefined
      };

      try {
        var res = await fetch('/api/athletes/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-athletes');
          alert('✅ Profil nageur mis à jour avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de mettre à jour le nageur'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Enregistrer les Modifications';
      }
    }

    async function handleDeleteAthlete(id, name) {
      if (!confirm('⚠️ Voulez-vous vraiment supprimer le nageur ' + name + ' ?\\n\\nSes feuilles de présence et chronomètres enregistrés seront également supprimés.')) return;
      try {
        var res = await fetch('/api/athletes/' + encodeURIComponent(id), { method: 'DELETE' });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-athletes');
          alert('✅ ' + data.message);
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de supprimer le nageur'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      }
    }

    // ==================== GESTION DES SÉANCES ====================
    function openCreateSessionModal() {
      document.getElementById('form-create-session').reset();
      var today = new Date().toISOString().split('T')[0];
      document.getElementById('create-sess-date').value = today;
      document.getElementById('create-sess-startTime').value = '18:00';
      document.getElementById('create-sess-endTime').value = '20:00';
      document.getElementById('modal-create-session').classList.add('active');
    }

    function openEditSessionModal(b64) {
      var s = decodeB64(b64);
      if (!s) return;
      document.getElementById('edit-sess-id').value = s.id;
      document.getElementById('edit-sess-title').value = s.title || '';
      document.getElementById('edit-sess-group').value = s.groupName || 'Tous les groupes';
      document.getElementById('edit-sess-date').value = s.date || '';
      document.getElementById('edit-sess-startTime').value = s.startTime || '18:00';
      document.getElementById('edit-sess-endTime').value = s.endTime || '20:00';
      document.getElementById('edit-sess-poolType').value = s.poolType || 'POOL_25M';
      document.getElementById('edit-sess-location').value = s.location || '';
      document.getElementById('edit-sess-focus').value = s.focus || '';
      document.getElementById('modal-edit-session').classList.add('active');
    }

    async function submitCreateSession(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-submit-create-sess');
      btn.disabled = true;
      btn.innerText = 'Création en cours...';

      var payload = {
        title: document.getElementById('create-sess-title').value.trim(),
        groupName: document.getElementById('create-sess-group').value,
        date: document.getElementById('create-sess-date').value,
        startTime: document.getElementById('create-sess-startTime').value,
        endTime: document.getElementById('create-sess-endTime').value,
        poolType: document.getElementById('create-sess-poolType').value,
        location: document.getElementById('create-sess-location').value.trim() || 'Bassin d\'entraînement',
        focus: document.getElementById('create-sess-focus').value.trim() || 'Général'
      };

      try {
        var res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-sessions');
          alert('✅ Séance créée avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de créer la séance'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Créer la Séance';
      }
    }

    async function submitEditSession(e) {
      e.preventDefault();
      var id = document.getElementById('edit-sess-id').value;
      var btn = document.getElementById('btn-submit-edit-sess');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var payload = {
        title: document.getElementById('edit-sess-title').value.trim(),
        groupName: document.getElementById('edit-sess-group').value,
        date: document.getElementById('edit-sess-date').value,
        startTime: document.getElementById('edit-sess-startTime').value,
        endTime: document.getElementById('edit-sess-endTime').value,
        poolType: document.getElementById('edit-sess-poolType').value,
        location: document.getElementById('edit-sess-location').value.trim() || 'Bassin d\'entraînement',
        focus: document.getElementById('edit-sess-focus').value.trim() || 'Général'
      };

      try {
        var res = await fetch('/api/sessions/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-sessions');
          alert('✅ Séance mise à jour avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de mettre à jour la séance'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Enregistrer les Modifications';
      }
    }

    async function handleDeleteSession(id, title) {
      if (!confirm('⚠️ Voulez-vous vraiment supprimer la séance "' + title + '" ?\\n\\nLes pointages et feuilles d\'appel associés seront également supprimés.')) return;
      try {
        var res = await fetch('/api/sessions/' + encodeURIComponent(id), { method: 'DELETE' });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-sessions');
          alert('✅ ' + data.message);
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de supprimer la séance'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      }
    }

    async function handleGenerateDailySessions() {
      if (!confirm('⚡ Souhaitez-vous générer automatiquement le planning type des séances pour aujourd\'hui ?')) return;
      try {
        var res = await fetch('/api/sessions/generate-daily', { method: 'POST' });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-sessions');
          alert('✅ ' + data.message);
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de générer les séances'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      }
    }

    // ==================== GESTION DES CHRONOMÈTRES ====================
    function openCreateTimeModal() {
      document.getElementById('form-create-time').reset();
      var today = new Date().toISOString().split('T')[0];
      document.getElementById('create-time-date').value = today;
      document.getElementById('modal-create-time').classList.add('active');
    }

    function openEditTimeModal(b64) {
      var t = decodeB64(b64);
      if (!t) return;
      document.getElementById('edit-time-id').value = t.id;
      document.getElementById('edit-time-athleteId').value = t.athleteId || '';
      document.getElementById('edit-time-stroke').value = t.stroke || 'Nage Libre';
      document.getElementById('edit-time-distance').value = t.distance || '50';
      document.getElementById('edit-time-poolType').value = t.poolType || 'POOL_25M';
      document.getElementById('edit-time-seconds').value = (t.timeInMs / 1000).toFixed(2);
      document.getElementById('edit-time-competition').value = t.competition || 'Entraînement chronométré';
      document.getElementById('edit-time-date').value = t.date || '';
      document.getElementById('edit-time-notes').value = t.notes || '';
      document.getElementById('modal-edit-time').classList.add('active');
    }

    async function submitCreateTime(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-submit-create-time');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var sec = parseFloat(document.getElementById('create-time-seconds').value);
      if (isNaN(sec) || sec <= 0) {
        alert('Veuillez entrer un temps valide en secondes (ex: 24.50).');
        btn.disabled = false;
        btn.innerText = 'Enregistrer le Chrono';
        return;
      }

      var payload = {
        athleteId: document.getElementById('create-time-athleteId').value,
        stroke: document.getElementById('create-time-stroke').value,
        distance: Number(document.getElementById('create-time-distance').value),
        poolType: document.getElementById('create-time-poolType').value,
        timeInMs: Math.round(sec * 1000),
        competition: document.getElementById('create-time-competition').value.trim() || 'Entraînement chronométré',
        date: document.getElementById('create-time-date').value,
        notes: document.getElementById('create-time-notes').value.trim() || undefined
      };

      try {
        var res = await fetch('/api/times', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-times');
          alert('✅ ' + (data.message || 'Chronomètre enregistré avec succès !'));
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || "Impossible d'enregistrer le chrono"));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Enregistrer le Chrono';
      }
    }

    async function submitEditTime(e) {
      e.preventDefault();
      var id = document.getElementById('edit-time-id').value;
      var btn = document.getElementById('btn-submit-edit-time');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var sec = parseFloat(document.getElementById('edit-time-seconds').value);
      if (isNaN(sec) || sec <= 0) {
        alert('Veuillez entrer un temps valide en secondes.');
        btn.disabled = false;
        btn.innerText = 'Enregistrer les Modifications';
        return;
      }

      var payload = {
        athleteId: document.getElementById('edit-time-athleteId').value,
        stroke: document.getElementById('edit-time-stroke').value,
        distance: Number(document.getElementById('edit-time-distance').value),
        poolType: document.getElementById('edit-time-poolType').value,
        timeInMs: Math.round(sec * 1000),
        competition: document.getElementById('edit-time-competition').value.trim() || 'Entraînement chronométré',
        date: document.getElementById('edit-time-date').value,
        notes: document.getElementById('edit-time-notes').value.trim() || undefined
      };

      try {
        var res = await fetch('/api/times/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-times');
          alert('✅ Chronomètre mis à jour avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de mettre à jour le chrono'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Enregistrer les Modifications';
      }
    }

    async function handleDeleteTime(id, athleteName) {
      if (!confirm('⚠️ Voulez-vous vraiment supprimer ce chronomètre pour ' + athleteName + ' ?')) return;
      try {
        var res = await fetch('/api/times/' + encodeURIComponent(id), { method: 'DELETE' });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-times');
          alert('✅ ' + data.message);
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de supprimer le chronomètre'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      }
    }

    // ==================== GESTION DES GROUPES ====================
    function openCreateGroupModal() {
      document.getElementById('form-create-group').reset();
      document.getElementById('modal-create-group').classList.add('active');
    }

    function openEditGroupModal(b64) {
      var g = decodeB64(b64);
      if (!g) return;
      document.getElementById('edit-grp-id').value = g.id;
      document.getElementById('edit-grp-name').value = g.name || '';
      document.getElementById('edit-grp-description').value = g.description || '';
      document.getElementById('edit-grp-coachId').value = g.coachId || '';
      document.getElementById('modal-edit-group').classList.add('active');
    }

    async function submitCreateGroup(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-submit-create-grp');
      btn.disabled = true;
      btn.innerText = 'Création...';

      var payload = {
        name: document.getElementById('create-grp-name').value.trim(),
        description: document.getElementById('create-grp-description').value.trim(),
        coachId: document.getElementById('create-grp-coachId').value || undefined
      };

      try {
        var res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-groups');
          alert('✅ Groupe créé avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de créer le groupe'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Créer le Groupe';
      }
    }

    async function submitEditGroup(e) {
      e.preventDefault();
      var id = document.getElementById('edit-grp-id').value;
      var btn = document.getElementById('btn-submit-edit-grp');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var payload = {
        name: document.getElementById('edit-grp-name').value.trim(),
        description: document.getElementById('edit-grp-description').value.trim(),
        coachId: document.getElementById('edit-grp-coachId').value || undefined
      };

      try {
        var res = await fetch('/api/groups/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-groups');
          alert('✅ Groupe mis à jour avec succès !');
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de mettre à jour le groupe'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = 'Enregistrer les Modifications';
      }
    }

    async function handleDeleteGroup(id, name) {
      if (!confirm('⚠️ Voulez-vous vraiment supprimer le groupe "' + name + '" ?')) return;
      try {
        var res = await fetch('/api/groups/' + encodeURIComponent(id), { method: 'DELETE' });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-groups');
          alert('✅ ' + data.message);
          window.location.reload();
        } else {
          alert('❌ Erreur : ' + (data.message || 'Impossible de supprimer le groupe'));
        }
      } catch(err) {
        alert('❌ Erreur réseau : ' + err.message);
      }
    }

    // ==================== GESTION DES UTILISATEURS / COMPTES ====================
    function openCreateUserModal() {
      document.getElementById('form-create-user').reset();
      document.getElementById('modal-create-user').classList.add('active');
    }

    function onRoleChange(type) {
      var role = document.getElementById(type + '-role').value;
      if (role === 'ADMIN') {
        var allBox = document.querySelector("input[name='" + type + "-groups'][value='Tous les groupes']");
        if (allBox) allBox.checked = true;
      }
    }

    function openEditUserModal(b64Data) {
      var user = decodeB64(b64Data);
      if (!user) return;
      document.getElementById('edit-id').value = user.id;
      document.getElementById('edit-firstName').value = user.firstName || '';
      document.getElementById('edit-lastName').value = user.lastName || '';
      document.getElementById('edit-username').value = user.username || '';
      document.getElementById('edit-email').value = user.email || '';
      document.getElementById('edit-phone').value = user.phone || '';
      document.getElementById('edit-password').value = '';
      document.getElementById('edit-role').value = user.role || 'COACH';

      var userGroups = Array.isArray(user.assignedGroups) ? user.assignedGroups : [user.assignedGroup || 'Tous les groupes'];
      document.querySelectorAll("input[name='edit-groups']").forEach(function(cb) {
        cb.checked = userGroups.indexOf(cb.value) !== -1;
      });

      document.getElementById('modal-edit-user').classList.add('active');
    }

    async function submitCreateUser(e) {
      e.preventDefault();
      var btn = document.getElementById('btn-submit-create');
      btn.disabled = true;
      btn.innerText = 'Création en cours...';

      var selectedGroups = [];
      document.querySelectorAll("input[name='create-groups']:checked").forEach(function(cb) {
        selectedGroups.push(cb.value);
      });

      if (selectedGroups.length === 0) {
        alert("Veuillez cocher au moins un groupe assigné.");
        btn.disabled = false;
        btn.innerText = "Créer le Compte";
        return;
      }

      var payload = {
        firstName: document.getElementById('create-firstName').value.trim(),
        lastName: document.getElementById('create-lastName').value.trim(),
        username: document.getElementById('create-username').value.trim(),
        email: document.getElementById('create-email').value.trim(),
        password: document.getElementById('create-password').value,
        role: document.getElementById('create-role').value,
        phone: document.getElementById('create-phone').value.trim(),
        assignedGroups: selectedGroups
      };

      try {
        var res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-users');
          alert("✅ Compte créé avec succès !");
          window.location.reload();
        } else {
          alert("❌ Erreur : " + (data.message || "Impossible de créer le compte"));
        }
      } catch(err) {
        alert("❌ Erreur réseau : " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = "Créer le Compte";
      }
    }

    async function submitEditUser(e) {
      e.preventDefault();
      var id = document.getElementById('edit-id').value;
      var btn = document.getElementById('btn-submit-edit');
      btn.disabled = true;
      btn.innerText = 'Enregistrement...';

      var selectedGroups = [];
      document.querySelectorAll("input[name='edit-groups']:checked").forEach(function(cb) {
        selectedGroups.push(cb.value);
      });

      if (selectedGroups.length === 0) {
        alert("Veuillez cocher au moins un groupe assigné.");
        btn.disabled = false;
        btn.innerText = "Enregistrer les Modifications";
        return;
      }

      var payload = {
        firstName: document.getElementById('edit-firstName').value.trim(),
        lastName: document.getElementById('edit-lastName').value.trim(),
        username: document.getElementById('edit-username').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        role: document.getElementById('edit-role').value,
        phone: document.getElementById('edit-phone').value.trim(),
        assignedGroups: selectedGroups
      };

      var newPass = document.getElementById('edit-password').value;
      if (newPass && newPass.trim().length > 0) {
        payload.password = newPass.trim();
      }

      try {
        var res = await fetch('/api/auth/users/' + encodeURIComponent(id), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-users');
          alert("✅ Compte mis à jour avec succès !");
          window.location.reload();
        } else {
          alert("❌ Erreur : " + (data.message || "Impossible de modifier le compte"));
        }
      } catch(err) {
        alert("❌ Erreur réseau : " + err.message);
      } finally {
        btn.disabled = false;
        btn.innerText = "Enregistrer les Modifications";
      }
    }

    async function handleDeleteUser(id, fullName, role) {
      var confirmDelete = confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement le compte de " + fullName + " (" + role + ") ?");
      if (!confirmDelete) return;

      try {
        var res = await fetch('/api/auth/users/' + encodeURIComponent(id), {
          method: 'DELETE'
        });
        var data = await res.json();
        if (data.success) {
          localStorage.setItem('ascos_active_tab', 'tab-users');
          alert("✅ " + data.message);
          window.location.reload();
        } else {
          alert("❌ Erreur : " + (data.message || "Impossible de supprimer le compte"));
        }
      } catch(err) {
        alert("❌ Erreur réseau : " + err.message);
      }
    }

    // ==================== OUTILS GLOBAUX BD ====================
    async function handleResetDb() {
      var confirmFirst = confirm("⚠️ ATTENTION : Vous êtes sur le point de réinitialiser la base de données à zéro.\\n\\n• Tous les nageurs, séances, présences et chronomètres seront supprimés.\\n• LE COMPTE ADMINISTRATEUR SERA TOUJOURS CONSERVÉ.\\n\\nSouhaitez-vous continuer ?");
      if (!confirmFirst) return;

      var confirmSecond = prompt("Pour confirmer cette opération irréversible, tapez le mot 'RESET' en majuscules ci-dessous :");
      if (confirmSecond !== 'RESET') {
        alert("Opération annulée. Le mot 'RESET' n'a pas été saisi.");
        return;
      }

      try {
        var res = await fetch('/api/database/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        var data = await res.json();
        if (data.success) {
          alert("✅ " + data.message);
          window.location.reload();
        } else {
          alert("❌ Erreur : " + (data.message || 'Impossible de réinitialiser la base'));
        }
      } catch (err) {
        alert("❌ Erreur réseau : " + err.message);
      }
    }

    async function handleRestoreFile(evt) {
      var file = evt.target.files && evt.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = async function(e) {
        try {
          var content = JSON.parse(e.target.result);
          var confirmRestore = confirm("⚠️ Voulez-vous vraiment restaurer les données à partir de ce fichier de sauvegarde ?\\n\\nCela va mettre à jour la base avec les éléments contenus dans le fichier.");
          if (!confirmRestore) {
            evt.target.value = '';
            return;
          }

          var res = await fetch('/api/database/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content)
          });
          var data = await res.json();
          if (data.success) {
            alert("✅ " + data.message);
            window.location.reload();
          } else {
            alert("❌ Erreur : " + (data.message || 'Impossible de restaurer la base'));
          }
        } catch(err) {
          alert("❌ Fichier JSON invalide : " + err.message);
        } finally {
          evt.target.value = '';
        }
      };
      reader.readAsText(file);
    }
  </script>
</body>
</html>`;

  return res.send(html);
};

