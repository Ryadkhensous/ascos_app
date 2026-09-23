import { Request, Response } from 'express';
import { dbStore, AttendanceData } from '../services/store';

const normalizeStr = (str?: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const isAllGroupsMatch = (groupName?: string) => {
  const norm = normalizeStr(groupName);
  return (
    !norm ||
    norm === 'tous' ||
    norm === 'tous les groupes' ||
    norm === 'club complet' ||
    norm === 'tous mes groupes' ||
    norm === 'general'
  );
};

const getAthletesForSession = (sessionGroupName?: string) => {
  if (isAllGroupsMatch(sessionGroupName)) {
    return dbStore.athletes;
  }
  const norm = normalizeStr(sessionGroupName);
  return dbStore.athletes.filter((a) => normalizeStr(a.groupName) === norm);
};

// Enregistrer ou mettre à jour la présence d'un athlète à une séance
export const markAttendance = (req: Request, res: Response) => {
  try {
    const { sessionId, athleteId, status, notes } = req.body;

    if (!sessionId || !athleteId || !status) {
      return res.status(400).json({ success: false, message: 'sessionId, athleteId et status requis' });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const index = dbStore.attendances.findIndex(
      (a) => a.sessionId === sessionId && a.athleteId === athleteId
    );

    if (index !== -1) {
      dbStore.attendances[index].status = status;
      if (notes !== undefined) dbStore.attendances[index].notes = notes;
      dbStore.attendances[index].updatedAt = new Date().toISOString();
    } else {
      const newRecord: AttendanceData = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sessionId,
        athleteId,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };
      dbStore.attendances.push(newRecord);
    }

    // Recalculer le taux de présence de l'athlète
    recalculateAthleteAttendance(athleteId);
    dbStore.saveToFile();

    return res.json({ success: true, message: 'Présence mise à jour avec succès' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Enregistrer la feuille d'appel complète d'une séance (batch)
export const saveBatchAttendance = (req: Request, res: Response) => {
  try {
    const { sessionId, records } = req.body;

    if (!sessionId || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'sessionId et tableau records requis' });
    }

    for (const item of records) {
      const { athleteId, status, notes } = item;
      const index = dbStore.attendances.findIndex(
        (a) => a.sessionId === sessionId && a.athleteId === athleteId
      );

      if (index !== -1) {
        dbStore.attendances[index].status = status;
        if (notes !== undefined) dbStore.attendances[index].notes = notes;
        dbStore.attendances[index].updatedAt = new Date().toISOString();
      } else {
        dbStore.attendances.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          athleteId,
          status,
          notes,
          updatedAt: new Date().toISOString(),
        });
      }

      recalculateAthleteAttendance(athleteId);
    }

    dbStore.saveToFile();
    return res.json({ success: true, message: 'Feuille d\'appel enregistrée avec succès' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Récupérer l'historique complet des présences par date / séance
export const getAttendanceHistory = (req: Request, res: Response) => {
  try {
    const { groupName, startDate, endDate } = req.query;

    let sessions = [...dbStore.sessions];
    if (groupName && groupName !== 'Tous') {
      const normQuery = normalizeStr(String(groupName));
      sessions = sessions.filter((s) => {
        if (isAllGroupsMatch(s.groupName)) return true;
        return normalizeStr(s.groupName) === normQuery;
      });
    }
    if (startDate) {
      sessions = sessions.filter((s) => s.date >= String(startDate));
    }
    if (endDate) {
      sessions = sessions.filter((s) => s.date <= String(endDate));
    }

    sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const history = sessions.map((sess) => {
      const records = dbStore.attendances.filter((att) => att.sessionId === sess.id);
      const groupAthletes = getAthletesForSession(sess.groupName);

      const list = groupAthletes.map((ath) => {
        const rec = records.find((r) => r.athleteId === ath.id);
        return {
          athleteId: ath.id,
          athleteName: `${ath.firstName} ${ath.lastName}`,
          category: ath.category,
          status: rec ? rec.status : 'PRESENT',
          notes: rec ? rec.notes || '' : '',
        };
      });

      const present = list.filter((i) => i.status === 'PRESENT').length;
      const late = list.filter((i) => i.status === 'LATE').length;
      const absent = list.filter((i) => i.status === 'ABSENT').length;
      const excused = list.filter((i) => i.status === 'EXCUSED').length;
      const total = list.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100.0;

      return {
        session: sess,
        summary: {
          total,
          present,
          late,
          absent,
          excused,
          rate,
        },
        records: list,
      };
    });

    return res.json({ success: true, count: history.length, data: history });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Exporter l'historique ou une séance spécifique au format CSV (compatible Microsoft Excel)
export const exportAttendanceCsv = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;

    const rows: string[] = [];
    rows.push('sep=;');
    rows.push('Date;Séance;Groupe;Bassin;Nom Nageur;Prénom Nageur;Catégorie;Statut Présence;Remarques');

    let sessionsToExport = dbStore.sessions;
    if (sessionId) {
      sessionsToExport = sessionsToExport.filter((s) => s.id === sessionId);
    }

    for (const sess of sessionsToExport) {
      const groupAthletes = getAthletesForSession(sess.groupName);
      const records = dbStore.attendances.filter((att) => att.sessionId === sess.id);

      for (const ath of groupAthletes) {
        const rec = records.find((r) => r.athleteId === ath.id);
        const status = rec ? rec.status : 'PRESENT';
        const notes = rec ? rec.notes || '' : '';

        const statusFr =
          status === 'PRESENT'
            ? 'Présent'
            : status === 'LATE'
            ? 'Retard'
            : status === 'EXCUSED'
            ? 'Excusé'
            : 'Absent';

        rows.push(
          `${sess.date};"${sess.title}";"${sess.groupName}";"${
            sess.poolType === 'POOL_50M' ? '50m' : '25m'
          }";"${ath.lastName}";"${ath.firstName}";"${ath.category}";"${statusFr}";"${notes}"`
        );
      }
    }

    const csvContent = '\uFEFF' + rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ascos_presences.csv"');
    return res.send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir les statistiques d'assiduité globales du club
export const getAttendanceStats = (req: Request, res: Response) => {
  try {
    const totalRecords = dbStore.attendances.length;
    const presentCount = dbStore.attendances.filter((a) => a.status === 'PRESENT').length;
    const lateCount = dbStore.attendances.filter((a) => a.status === 'LATE').length;
    const absentCount = dbStore.attendances.filter((a) => a.status === 'ABSENT').length;
    const excusedCount = dbStore.attendances.filter((a) => a.status === 'EXCUSED').length;

    const globalRate = totalRecords > 0 ? ((presentCount + lateCount) / totalRecords) * 100 : 92.5;

    return res.json({
      success: true,
      data: {
        globalRate: Math.round(globalRate * 10) / 10,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        totalRecords,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir la feuille d'appel d'une séance spécifique
export const getSessionAttendance = (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = dbStore.sessions.find((s) => s.id === sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Séance introuvable' });
    }

    const groupAthletes = getAthletesForSession(session.groupName);
    const existingRecords = dbStore.attendances.filter((a) => a.sessionId === sessionId);

    const sheet = groupAthletes.map((ath) => {
      const rec = existingRecords.find((r) => r.athleteId === ath.id);
      return {
        athleteId: ath.id,
        athleteName: `${ath.firstName} ${ath.lastName}`,
        category: ath.category,
        photoUrl: ath.photoUrl,
        status: rec ? rec.status : 'PRESENT',
        notes: rec ? rec.notes || '' : '',
      };
    });

    return res.json({
      success: true,
      data: {
        session,
        attendances: sheet,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Supprimer un enregistrement de présence
export const deleteAttendance = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = dbStore.attendances.find((a) => a.id === id);

    if (!record) {
      return res.status(404).json({ success: false, message: 'Enregistrement de présence introuvable' });
    }

    const athleteId = record.athleteId;
    dbStore.attendances = dbStore.attendances.filter((a) => a.id !== id);
    recalculateAthleteAttendance(athleteId);
    dbStore.saveToFile();

    return res.json({ success: true, message: 'Présence supprimée avec succès' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

function recalculateAthleteAttendance(athleteId: string) {
  const athlete = dbStore.athletes.find((a) => a.id === athleteId);
  if (!athlete) return;

  const logs = dbStore.attendances.filter((a) => a.athleteId === athleteId);
  if (logs.length === 0) {
    athlete.totalSessions = 0;
    athlete.attendedSessions = 0;
    athlete.attendanceRate = 100.0;
    return;
  }

  const presentOrLate = logs.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  athlete.totalSessions = logs.length;
  athlete.attendedSessions = presentOrLate;
  athlete.attendanceRate = Math.round((presentOrLate / logs.length) * 1000) / 10;
}

