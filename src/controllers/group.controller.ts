import { Request, Response } from 'express';
import { dbStore, TrainingGroupData } from '../services/store';

export const getGroups = (_req: Request, res: Response) => {
  try {
    const groupsWithStats = dbStore.groups.map((group) => {
      const athletes = dbStore.athletes.filter((a) => a.groupName === group.name);
      const sessions = dbStore.sessions.filter((s) => {
        const sGroups = String(s.groupName || '').split(',').map((g) => g.trim().toLowerCase());
        return sGroups.includes(group.name.toLowerCase()) || sGroups.includes('tous les groupes') || sGroups.includes('tous');
      });
      const avgAttendance = athletes.length > 0
        ? Math.round((athletes.reduce((acc, a) => acc + a.attendanceRate, 0) / athletes.length) * 10) / 10
        : 100.0;

      return {
        ...group,
        athleteCount: athletes.length,
        sessionCount: sessions.length,
        averageAttendanceRate: avgAttendance,
      };
    });

    return res.json({
      success: true,
      count: groupsWithStats.length,
      data: groupsWithStats,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGroupById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const group = dbStore.groups.find((g) => g.id === id || g.name === id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Groupe introuvable' });
    }

    const athletes = dbStore.athletes.filter((a) => a.groupName === group.name);
    const sessions = dbStore.sessions.filter((s) => {
      const sGroups = String(s.groupName || '').split(',').map((g) => g.trim().toLowerCase());
      return sGroups.includes(group.name.toLowerCase()) || sGroups.includes('tous les groupes') || sGroups.includes('tous');
    });

    return res.json({
      success: true,
      data: {
        ...group,
        athleteCount: athletes.length,
        sessionCount: sessions.length,
        athletes,
        recentSessions: sessions.slice(0, 5),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createGroup = (req: Request, res: Response) => {
  try {
    const { name, description, coachId } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Le nom du groupe est requis' });
    }

    const exists = dbStore.groups.some((g) => g.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return res.status(409).json({ success: false, message: 'Un groupe avec ce nom existe déjà' });
    }

    let coachName = 'Non assigné';
    if (coachId) {
      const coach = dbStore.users.find((u) => u.id === coachId);
      if (coach) coachName = `${coach.firstName} ${coach.lastName}`;
    }

    const newGroup: TrainingGroupData = {
      id: `grp-${Date.now()}`,
      name,
      description: description || '',
      coachId,
      coachName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.groups.push(newGroup);
    dbStore.saveToFile();

    return res.status(201).json({ success: true, data: newGroup });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGroup = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = dbStore.groups.findIndex((g) => g.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Groupe introuvable' });
    }

    const oldName = dbStore.groups[index].name;
    const { name, description, coachId } = req.body;

    if (coachId) {
      const coach = dbStore.users.find((u) => u.id === coachId);
      if (coach) {
        dbStore.groups[index].coachName = `${coach.firstName} ${coach.lastName}`;
        dbStore.groups[index].coachId = coachId;
      }
    }

    if (name && name !== oldName) {
      // Mettre à jour le nom du groupe dans les athlètes et séances associés
      dbStore.athletes.forEach((a) => {
        if (a.groupName === oldName) a.groupName = name;
      });
      dbStore.sessions.forEach((s) => {
        if (s.groupName === oldName) s.groupName = name;
      });
      dbStore.groups[index].name = name;
    }

    if (description !== undefined) {
      dbStore.groups[index].description = description;
    }

    dbStore.groups[index].updatedAt = new Date().toISOString();
    dbStore.saveToFile();

    return res.json({ success: true, data: dbStore.groups[index] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGroup = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initialLength = dbStore.groups.length;
    const groupToDelete = dbStore.groups.find((g) => g.id === id);

    if (!groupToDelete) {
      return res.status(404).json({ success: false, message: 'Groupe introuvable' });
    }

    dbStore.groups = dbStore.groups.filter((g) => g.id !== id);
    dbStore.saveToFile();

    return res.json({
      success: true,
      message: `Groupe ${groupToDelete.name} supprimé avec succès`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
