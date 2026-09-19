import { Request, Response } from 'express';
import { dbStore, SessionData } from '../services/store';

export const getSessions = (req: Request, res: Response) => {
  try {
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
      list = list.filter((s) => groupsFilter.includes(s.groupName));
    }

    if (groupName && groupName !== 'Tous') {
      list = list.filter((s) => s.groupName === groupName);
    }

    // Trier par date la plus récente
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    // Récupérer les athlètes faisant partie du groupe de la séance
    const groupAthletes = dbStore.athletes.filter((a) => a.groupName === session.groupName);

    // Récupérer les présences déjà enregistrées pour cette séance
    const attendances = dbStore.attendances.filter((att) => att.sessionId === id);

    // Combiner pour chaque athlète son statut de présence
    const attendanceSheet = groupAthletes.map((athlete) => {
      const record = attendances.find((att) => att.athleteId === athlete.id);
      return {
        athleteId: athlete.id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        category: athlete.category,
        photoUrl: athlete.photoUrl,
        status: record ? record.status : 'PRESENT', // Présent par défaut
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

    if (!title || !groupName || !date) {
      return res.status(400).json({ success: false, message: 'Titre, groupe et date requis' });
    }

    const newSession: SessionData = {
      id: `sess-${Date.now()}`,
      title,
      groupName,
      date,
      startTime: startTime || '18:00',
      endTime: endTime || '20:00',
      poolType: poolType || 'POOL_25M',
      focus: focus || 'Général',
      location: location || 'Bassin d\'entraînement',
    };

    dbStore.sessions.unshift(newSession);

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

    return res.json({ success: true, message: 'Séance et feuilles de présence associées supprimées' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

