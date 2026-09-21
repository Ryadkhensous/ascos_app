import { Request, Response } from 'express';
import { dbStore, SwimmingTimeData } from '../services/store';

// Enregistrer un nouveau chrono de natation
export const recordTime = (req: Request, res: Response) => {
  try {
    const { athleteId, stroke, distance, poolType, timeInMs, competition, notes, date } = req.body;

    if (!athleteId || !stroke || !distance || !timeInMs) {
      return res.status(400).json({
        success: false,
        message: 'athleteId, stroke, distance et timeInMs requis',
      });
    }

    const athlete = dbStore.athletes.find((a) => a.id === athleteId);
    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Athlète non trouvé' });
    }

    const newTime: SwimmingTimeData = {
      id: `t-${Date.now()}`,
      athleteId,
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      stroke,
      distance: Number(distance),
      poolType: poolType || 'POOL_25M',
      timeInMs: Number(timeInMs),
      isPersonalBest: false,
      date: date || new Date().toISOString().split('T')[0],
      competition: competition || 'Entraînement chronométré',
      notes,
    };

    // Vérifier et ajuster si c'est un Record Personnel (PB)
    const isPB = dbStore.checkAndSetPersonalBest(newTime);
    dbStore.swimmingTimes.unshift(newTime);
    dbStore.saveToFile();

    return res.status(201).json({
      success: true,
      data: newTime,
      isPersonalBest: isPB,
      message: isPB ? '🔥 Nouveau Record Personnel (PB) battu !' : 'Chronomètre enregistré',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer l'historique des chronos d'un athlète avec filtre par nage/distance
export const getAthleteTimes = (req: Request, res: Response) => {
  try {
    const { athleteId } = req.params;
    const { stroke, distance, poolType } = req.query;

    let times = dbStore.swimmingTimes.filter((t) => t.athleteId === athleteId);

    if (stroke) {
      times = times.filter((t) => t.stroke === stroke);
    }
    if (distance) {
      times = times.filter((t) => t.distance === Number(distance));
    }
    if (poolType) {
      times = times.filter((t) => t.poolType === poolType);
    }

    // Trier par date croissante (pour tracer les courbes d'évolution)
    times.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return res.json({ success: true, count: times.length, data: times });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir le tableau des records du club (PBs par épreuve)
export const getClubRecords = (req: Request, res: Response) => {
  try {
    const pbs = dbStore.swimmingTimes.filter((t) => t.isPersonalBest);
    return res.json({ success: true, count: pbs.length, data: pbs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir tous les temps enregistrés avec filtres
export const getAllTimes = (req: Request, res: Response) => {
  try {
    const { stroke, distance, poolType, athleteId, limit } = req.query;
    let list = [...dbStore.swimmingTimes];

    if (athleteId) {
      list = list.filter((t) => t.athleteId === athleteId);
    }
    if (stroke) {
      list = list.filter((t) => t.stroke === stroke);
    }
    if (distance) {
      list = list.filter((t) => t.distance === Number(distance));
    }
    if (poolType) {
      list = list.filter((t) => t.poolType === poolType);
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (limit) {
      list = list.slice(0, Number(limit));
    }

    return res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir un temps spécifique
export const getTimeById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const time = dbStore.swimmingTimes.find((t) => t.id === id);

    if (!time) {
      return res.status(404).json({ success: false, message: 'Chronomètre introuvable' });
    }

    return res.json({ success: true, data: time });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Mettre à jour un chrono (notes, compétition, etc.)
export const updateTime = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = dbStore.swimmingTimes.findIndex((t) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Chronomètre introuvable' });
    }

    dbStore.swimmingTimes[index] = {
      ...dbStore.swimmingTimes[index],
      ...req.body,
    };

    // Recalculer le PB si le temps a été modifié
    if (req.body.timeInMs) {
      dbStore.checkAndSetPersonalBest(dbStore.swimmingTimes[index]);
    }
    dbStore.saveToFile();

    return res.json({ success: true, data: dbStore.swimmingTimes[index] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer un chrono
export const deleteTime = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initialLength = dbStore.swimmingTimes.length;
    const deletedTime = dbStore.swimmingTimes.find((t) => t.id === id);

    if (!deletedTime) {
      return res.status(404).json({ success: false, message: 'Chronomètre introuvable' });
    }

    dbStore.swimmingTimes = dbStore.swimmingTimes.filter((t) => t.id !== id);

    // Si le temps supprimé était un PB, recalculer le PB pour cet athlète sur cette épreuve
    if (deletedTime.isPersonalBest) {
      const remainingSameEvent = dbStore.swimmingTimes.filter(
        (t) =>
          t.athleteId === deletedTime.athleteId &&
          t.stroke === deletedTime.stroke &&
          t.distance === deletedTime.distance &&
          t.poolType === deletedTime.poolType
      );
      if (remainingSameEvent.length > 0) {
        let best = remainingSameEvent[0];
        for (const t of remainingSameEvent) {
          if (t.timeInMs < best.timeInMs) best = t;
        }
        best.isPersonalBest = true;
      }
    }
    dbStore.saveToFile();

    return res.json({ success: true, message: 'Chronomètre supprimé avec succès' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir la liste des titres de compétitions
export const getCompetitions = (req: Request, res: Response) => {
  try {
    const existing = dbStore.swimmingTimes
      .map((t) => t.competition)
      .filter((c) => c && c.trim() !== '' && c !== 'Entraînement' && c !== 'Entraînement chronométré');

    const defaults = [
      'Championnat Régional',
      'Meeting National',
      'Interclubs Toutes Catégories',
      'Coupe Départementale',
      'Meeting de Printemps',
      'Test Chrono Officiel',
    ];

    const unique = Array.from(new Set([...defaults, ...existing]));
    return res.json({ success: true, count: unique.length, data: unique });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

