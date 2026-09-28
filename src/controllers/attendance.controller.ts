import { Request, Response } from 'express';
import { dbStore, AttendanceData } from '../services/store';

const normalizeStr = (str?: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getSessionGroups = (sessionGroupName?: string): string[] => {
  return String(sessionGroupName || '')
    .split(',')
    .map((g) => normalizeStr(g.trim()))
    .filter(Boolean);
};

const isAllGroupsMatch = (groupName?: string) => {
  const groups = getSessionGroups(groupName);
  if (groups.length === 0) return true;
  return groups.some(
    (norm) =>
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
  const groups = getSessionGroups(sessionGroupName);
  return dbStore.athletes.filter((a) => groups.includes(normalizeStr(a.groupName)));
};

// Calculer les minutes effectives d'entraînement restantes pour un athlète en retard
export function computeEffectiveMinutes(startTime: string, endTime: string, arrivalTime: string): number {
  try {
    const [startH, startM] = (startTime || '18:00').split(':').map(Number);
    const [endH, endM] = (endTime || '19:30').split(':').map(Number);
    const [arrH, arrM] = (arrivalTime || '18:00').split(':').map(Number);
    if (isNaN(startH) || isNaN(endH) || isNaN(arrH)) return 0;
    const startMin = startH * 60 + (startM || 0);
    const endMin = endH * 60 + (endM || 0);
    const arrMin = arrH * 60 + (arrM || 0);
    const totalSessionMin = endMin >= startMin ? endMin - startMin : (24 * 60 - startMin + endMin);

    if (arrMin <= startMin) return totalSessionMin;
    if (arrMin >= endMin) return 0;
    return Math.max(0, endMin - arrMin);
  } catch (_) {
    return 0;
  }
}

// Enregistrer ou mettre à jour la présence d'un athlète à une séance
export const markAttendance = (req: Request, res: Response) => {
  try {
    const { sessionId, athleteId, status, notes, arrivalTime, effectiveDurationMinutes } = req.body;

    if (!sessionId || !athleteId || !status) {
      return res.status(400).json({ success: false, message: 'sessionId, athleteId et status requis' });
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];
    const cleanStatus = status === 'EXCUSED' ? 'ABSENT' : status;
    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({ success: false, message: 'Statut invalide (PRESENT, ABSENT, LATE)' });
    }

    const session = dbStore.sessions.find((s) => s.id === sessionId);
    let computedDuration = effectiveDurationMinutes;
    if (cleanStatus === 'LATE' && arrivalTime && session) {
      if (computedDuration === undefined) {
        computedDuration = computeEffectiveMinutes(session.startTime, session.endTime, arrivalTime);
      }
    } else if (cleanStatus !== 'LATE') {
      computedDuration = undefined;
    }

    const index = dbStore.attendances.findIndex(
      (a) => a.sessionId === sessionId && a.athleteId === athleteId
    );

    if (index !== -1) {
      dbStore.attendances[index].status = cleanStatus;
      if (notes !== undefined) dbStore.attendances[index].notes = notes;
      dbStore.attendances[index].arrivalTime = cleanStatus === 'LATE' ? arrivalTime : undefined;
      dbStore.attendances[index].effectiveDurationMinutes = cleanStatus === 'LATE' ? computedDuration : undefined;
      dbStore.attendances[index].updatedAt = new Date().toISOString();
    } else {
      const newRecord: AttendanceData = {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sessionId,
        athleteId,
        status: cleanStatus,
        arrivalTime: cleanStatus === 'LATE' ? arrivalTime : undefined,
        effectiveDurationMinutes: cleanStatus === 'LATE' ? computedDuration : undefined,
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

    const session = dbStore.sessions.find((s) => s.id === sessionId);
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];

    for (const item of records) {
      const { athleteId, status, notes, arrivalTime, effectiveDurationMinutes } = item;
      const cleanStatus = status === 'EXCUSED' ? 'ABSENT' : status;
      if (!validStatuses.includes(cleanStatus)) continue;

      let computedDuration = effectiveDurationMinutes;
      if (cleanStatus === 'LATE' && arrivalTime && session && computedDuration === undefined) {
        computedDuration = computeEffectiveMinutes(session.startTime, session.endTime, arrivalTime);
      } else if (cleanStatus !== 'LATE') {
        computedDuration = undefined;
      }

      const index = dbStore.attendances.findIndex(
        (a) => a.sessionId === sessionId && a.athleteId === athleteId
      );

      if (index !== -1) {
        dbStore.attendances[index].status = cleanStatus;
        if (notes !== undefined) dbStore.attendances[index].notes = notes;
        dbStore.attendances[index].arrivalTime = cleanStatus === 'LATE' ? arrivalTime : undefined;
        dbStore.attendances[index].effectiveDurationMinutes = cleanStatus === 'LATE' ? computedDuration : undefined;
        dbStore.attendances[index].updatedAt = new Date().toISOString();
      } else {
        dbStore.attendances.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sessionId,
          athleteId,
          status: cleanStatus,
          arrivalTime: cleanStatus === 'LATE' ? arrivalTime : undefined,
          effectiveDurationMinutes: cleanStatus === 'LATE' ? computedDuration : undefined,
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
    const { groupName, coachGroups, groups, startDate, endDate } = req.query;

    const coachGroupsFilter: string[] = [];
    if (coachGroups) {
      const parsed = Array.isArray(coachGroups) ? coachGroups : String(coachGroups).split(',');
      coachGroupsFilter.push(
        ...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes')
      );
    } else if (groups) {
      const parsed = Array.isArray(groups) ? groups : String(groups).split(',');
      coachGroupsFilter.push(
        ...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes')
      );
    }

    let sessions = [...dbStore.sessions];

    // Si coachGroups est spécifié, ne garder que les séances concernant les groupes du coach
    if (coachGroupsFilter.length > 0) {
      sessions = sessions.filter((s) => {
        if (isAllGroupsMatch(s.groupName)) return true;
        const sGroups = getSessionGroups(s.groupName);
        return coachGroupsFilter.some((cg) => sGroups.includes(normalizeStr(cg)));
      });
    }

    if (groupName && groupName !== 'Tous' && groupName !== 'Tous les groupes' && groupName !== 'Tous mes groupes') {
      const normQuery = normalizeStr(String(groupName));
      sessions = sessions.filter((s) => {
        if (isAllGroupsMatch(s.groupName)) return true;
        const sGroups = getSessionGroups(s.groupName);
        return sGroups.includes(normQuery);
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
      let groupAthletes = getAthletesForSession(sess.groupName);

      // Si un entraîneur avec groupes assignés consulte, restreindre aux nageurs de ses groupes
      if (coachGroupsFilter.length > 0) {
        groupAthletes = groupAthletes.filter((a) =>
          coachGroupsFilter.some((cg) => normalizeStr(cg) === normalizeStr(a.groupName))
        );
      }

      const list = groupAthletes.map((ath) => {
        const rec = records.find((r) => r.athleteId === ath.id);
        const status = rec ? rec.status : 'PRESENT';
        return {
          athleteId: ath.id,
          athleteName: `${ath.firstName} ${ath.lastName}`,
          category: ath.category,
          groupName: ath.groupName,
          status,
          arrivalTime: status === 'LATE' ? rec?.arrivalTime : undefined,
          effectiveDurationMinutes: status === 'LATE' ? rec?.effectiveDurationMinutes : undefined,
          notes: rec ? rec.notes || '' : '',
        };
      });

      const present = list.filter((i) => i.status === 'PRESENT').length;
      const late = list.filter((i) => i.status === 'LATE').length;
      const absent = list.filter((i) => i.status === 'ABSENT').length;
      const total = list.length;
      const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 100.0;

      return {
        session: sess,
        summary: {
          total,
          present,
          late,
          absent,
          excused: 0,
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
    rows.push('Date;Séance;Groupe;Bassin;Nom Nageur;Prénom Nageur;Catégorie;Statut Présence;Heure Arrivée;Volume Effectif;Remarques');

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
        const arrivalTime = (status === 'LATE' && rec?.arrivalTime) ? rec.arrivalTime : '-';
        const volumeStr = (status === 'LATE' && rec?.effectiveDurationMinutes !== undefined)
          ? `${rec.effectiveDurationMinutes} min`
          : (status === 'PRESENT' ? 'Complet' : '0 min');

        const statusFr = status === 'PRESENT' ? 'Présent' : status === 'LATE' ? 'Retard' : 'Absent';

        rows.push(
          `${sess.date};"${sess.title}";"${sess.groupName}";"${
            sess.poolType === 'POOL_50M' ? '50m' : '25m'
          }";"${ath.lastName}";"${ath.firstName}";"${ath.category}";"${statusFr}";"${arrivalTime}";"${volumeStr}";"${notes}"`
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
    const excusedCount = 0;

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

    const { coachGroups, groups } = req.query;
    const coachGroupsFilter: string[] = [];
    if (coachGroups) {
      const parsed = Array.isArray(coachGroups) ? coachGroups : String(coachGroups).split(',');
      coachGroupsFilter.push(
        ...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes')
      );
    } else if (groups) {
      const parsed = Array.isArray(groups) ? groups : String(groups).split(',');
      coachGroupsFilter.push(
        ...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes')
      );
    }

    let groupAthletes = getAthletesForSession(session.groupName);
    if (coachGroupsFilter.length > 0) {
      groupAthletes = groupAthletes.filter((a) =>
        coachGroupsFilter.some((cg) => normalizeStr(cg) === normalizeStr(a.groupName))
      );
    }
    const existingRecords = dbStore.attendances.filter((a) => a.sessionId === sessionId);

    const sheet = groupAthletes.map((ath) => {
      const rec = existingRecords.find((r) => r.athleteId === ath.id);
      const status = rec ? rec.status : 'PRESENT';
      return {
        athleteId: ath.id,
        athleteName: `${ath.firstName} ${ath.lastName}`,
        category: ath.category,
        photoUrl: ath.photoUrl,
        status,
        arrivalTime: status === 'LATE' ? rec?.arrivalTime : undefined,
        effectiveDurationMinutes: status === 'LATE' ? rec?.effectiveDurationMinutes : undefined,
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

// Mettre à jour un enregistrement de présence existant
export const updateAttendance = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, arrivalTime, effectiveDurationMinutes } = req.body;

    const record = dbStore.attendances.find((a) => a.id === id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Enregistrement de présence introuvable' });
    }

    if (status) {
      const validStatuses = ['PRESENT', 'ABSENT', 'LATE'];
      const cleanStatus = status === 'EXCUSED' ? 'ABSENT' : status;
      if (!validStatuses.includes(cleanStatus)) {
        return res.status(400).json({ success: false, message: 'Statut invalide (PRESENT, ABSENT, LATE)' });
      }
      record.status = cleanStatus;
      if (cleanStatus === 'LATE') {
        record.arrivalTime = arrivalTime !== undefined ? arrivalTime : record.arrivalTime;
        const session = dbStore.sessions.find((s) => s.id === record.sessionId);
        if (effectiveDurationMinutes !== undefined) {
          record.effectiveDurationMinutes = effectiveDurationMinutes;
        } else if (record.arrivalTime && session) {
          record.effectiveDurationMinutes = computeEffectiveMinutes(session.startTime, session.endTime, record.arrivalTime);
        }
      } else {
        record.arrivalTime = undefined;
        record.effectiveDurationMinutes = undefined;
      }
    }

    if (notes !== undefined) {
      record.notes = notes;
    }

    record.updatedAt = new Date().toISOString();
    recalculateAthleteAttendance(record.athleteId);
    dbStore.saveToFile();

    return res.json({ success: true, data: record, message: 'Présence mise à jour avec succès' });
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

