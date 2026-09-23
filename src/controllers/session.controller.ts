import { Request, Response } from 'express';
import { dbStore, SessionData } from '../services/store';

function normalizeStr(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function generateDefaultSessionsForDate(targetDate: string): SessionData[] {
  const defaultTemplates = [
    {
      groupName: 'Tous les groupes',
      title: 'Séance Commune Club',
      startTime: '18:00',
      endTime: '19:30',
      poolType: 'POOL_25M' as const,
      focus: 'Échauffement & Aérobie',
      location: 'Bassin d\'entraînement (25m)',
    },
    {
      groupName: 'Groupe Élite',
      title: 'Aérobie & Vitesse Compétition',
      startTime: '18:00',
      endTime: '20:00',
      poolType: 'POOL_50M' as const,
      focus: 'Cadences & Chronos Officiels',
      location: 'Bassin Olympique (50m)',
    },
    {
      groupName: 'Groupe Performance',
      title: 'Technique 4 Nages & Virages',
      startTime: '19:00',
      endTime: '20:30',
      poolType: 'POOL_25M' as const,
      focus: 'Coulées, Virages & Départs',
      location: 'Bassin d\'entraînement (25m)',
    },
    {
      groupName: 'Groupe Espoirs',
      title: 'Perfectionnement Nage Libre & Dos',
      startTime: '17:30',
      endTime: '19:00',
      poolType: 'POOL_25M' as const,
      focus: 'Technique de nage & endurance',
      location: 'Bassin d\'entraînement (25m)',
    },
    {
      groupName: 'École de Natation',
      title: 'Apprentissage & Sécurité Aquatique',
      startTime: '16:30',
      endTime: '17:30',
      poolType: 'POOL_25M' as const,
      focus: 'Flottaison, Propulsion & Respiration',
      location: 'Petit Bassin d\'apprentissage',
    },
  ];

  const created: SessionData[] = [];
  for (const t of defaultTemplates) {
    const exists = dbStore.sessions.some(
      (s) => s.date === targetDate && normalizeStr(s.groupName) === normalizeStr(t.groupName)
    );
    if (!exists) {
      const sess: SessionData = {
        id: `sess-${targetDate}-${normalizeStr(t.groupName).replace(/\s+/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: targetDate,
        groupName: t.groupName,
        title: t.title,
        startTime: t.startTime,
        endTime: t.endTime,
        poolType: t.poolType,
        focus: t.focus,
        location: t.location,
      };
      dbStore.sessions.push(sess);
      created.push(sess);
    }
  }

  if (created.length > 0) {
    dbStore.saveToFile();
  }
  return created;
}

export const getSessions = (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Si aucune séance n'existe pour aujourd'hui, générer automatiquement les séances du jour
    if (dbStore.sessions.length === 0 || !dbStore.sessions.some((s) => s.date === today)) {
      generateDefaultSessionsForDate(today);
    }

    const { groupName, groups, coachGroups } = req.query;
    let list = [...dbStore.sessions];

    const groupsFilter: string[] = [];
    if (coachGroups) {
      const parsed = Array.isArray(coachGroups) ? coachGroups : String(coachGroups).split(',');
      groupsFilter.push(...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    } else if (groups) {
      const parsed = Array.isArray(groups) ? groups : String(groups).split(',');
      groupsFilter.push(...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    }

    if (groupsFilter.length > 0) {
      list = list.filter((s) => {
        const sGroups = String(s.groupName || '')
          .split(',')
          .map((g) => normalizeStr(g.trim()))
          .filter(Boolean);
        return (
          sGroups.length === 0 ||
          sGroups.some((g) => g === 'tous' || g === 'tous les groupes') ||
          groupsFilter.some((gf) => sGroups.includes(normalizeStr(gf)))
        );
      });
    }

    if (groupName && groupName !== 'Tous' && groupName !== 'Tous les groupes' && groupName !== 'Tous mes groupes') {
      const normTarget = normalizeStr(String(groupName));
      list = list.filter((s) => {
        const sGroups = String(s.groupName || '')
          .split(',')
          .map((g) => normalizeStr(g.trim()))
          .filter(Boolean);
        return (
          sGroups.length === 0 ||
          sGroups.some((g) => g === 'tous' || g === 'tous les groupes') ||
          sGroups.includes(normTarget)
        );
      });
    }

    // Trier par date la plus récente, puis par heure de début
    list.sort((a, b) => {
      const dDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dDiff !== 0) return dDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSessionById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = dbStore.sessions.find((s) => s.id === id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Séance introuvable' });
    }

    const sessionGroups = String(session.groupName || '')
      .split(',')
      .map((g) => normalizeStr(g.trim()))
      .filter(Boolean);

    const isAllGroups =
      sessionGroups.length === 0 ||
      sessionGroups.some(
        (g) =>
          g === 'tous' ||
          g === 'tous les groupes' ||
          g === 'club complet' ||
          g === 'tous mes groupes' ||
          g === 'general'
      );

    // Récupérer les athlètes faisant partie d'un des groupes de la séance ou tous si "Tous les groupes"
    const groupAthletes = isAllGroups
      ? dbStore.athletes
      : dbStore.athletes.filter((a) => sessionGroups.includes(normalizeStr(a.groupName)));

    // Récupérer les présences déjà enregistrées pour cette séance
    const attendances = dbStore.attendances.filter((att) => att.sessionId === id);

    // Combiner pour être certain d'avoir tous les athlètes éligibles sans doublon
    const athleteMap = new Map<string, typeof dbStore.athletes[0]>();
    for (const a of groupAthletes) {
      athleteMap.set(a.id, a);
    }
    // Inclure aussi tout athlète ayant déjà un pointage sur cette séance
    for (const att of attendances) {
      if (!athleteMap.has(att.athleteId)) {
        const found = dbStore.athletes.find((a) => a.id === att.athleteId);
        if (found) athleteMap.set(found.id, found);
      }
    }

    const allAthletes = Array.from(athleteMap.values());
    allAthletes.sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Combiner pour chaque athlète son statut de présence
    const attendanceSheet = allAthletes.map((athlete) => {
      const record = attendances.find((att) => att.athleteId === athlete.id);
      return {
        athleteId: athlete.id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        category: athlete.category,
        groupName: athlete.groupName,
        photoUrl: athlete.photoUrl,
        status: record ? record.status : 'PRESENT', // Présent par défaut pour faciliter l'appel
        notes: record ? record.notes : '',
      };
    });

    return res.json({
      success: true,
      data: {
        ...session,
        attendances: attendanceSheet,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createSession = (req: Request, res: Response) => {
  try {
    const { title, groupName, date, startTime, endTime, poolType, focus, location } = req.body;

    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Titre et date requis' });
    }

    const today = new Date().toISOString().split('T')[0];
    const newSession: SessionData = {
      id: `sess-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      title,
      groupName: groupName || 'Tous les groupes',
      date: date || today,
      startTime: startTime || '18:00',
      endTime: endTime || '20:00',
      poolType: poolType === 'POOL_50M' ? 'POOL_50M' : 'POOL_25M',
      focus: focus || 'Général',
      location: location || 'Bassin d\'entraînement',
    };

    dbStore.sessions.unshift(newSession);
    dbStore.saveToFile();

    return res.status(201).json({ success: true, data: newSession });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSession = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = dbStore.sessions.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Séance introuvable' });
    }

    dbStore.sessions[index] = {
      ...dbStore.sessions[index],
      ...req.body,
    };
    dbStore.saveToFile();

    return res.json({ success: true, data: dbStore.sessions[index] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSession = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initialLength = dbStore.sessions.length;
    dbStore.sessions = dbStore.sessions.filter((s) => s.id !== id);

    if (dbStore.sessions.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Séance introuvable' });
    }

    // Supprimer également les présences associées
    dbStore.attendances = dbStore.attendances.filter((a) => a.sessionId !== id);
    dbStore.saveToFile();

    return res.json({ success: true, message: 'Séance et feuilles de présence associées supprimées' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const generateDailySessions = (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = req.body?.date || req.query?.date || today;
    const created = generateDefaultSessionsForDate(String(targetDate));

    return res.json({
      success: true,
      count: created.length,
      message: `${created.length} séances créées pour le ${targetDate}`,
      data: created,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

