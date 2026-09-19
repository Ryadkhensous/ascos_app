import { Request, Response } from 'express';
import { dbStore } from '../services/store';

// Calculer la durée d'une séance en heures décimales (ex: 18:00 à 19:30 = 1.5h)
export function calculateSessionHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 1.5;
  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(endH)) return 1.5;
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);
    const diff = endMinutes >= startMinutes ? endMinutes - startMinutes : (24 * 60 - startMinutes + endMinutes);
    return Math.round((diff / 60) * 10) / 10;
  } catch (_) {
    return 1.5;
  }
}

export const getDashboardStats = (req: Request, res: Response) => {
  try {
    const totalAthletes = dbStore.athletes.length;

    // Taux d'assiduité moyen global
    const totalAttendance = dbStore.athletes.reduce((acc, curr) => acc + curr.attendanceRate, 0);
    const averageAttendanceRate = totalAthletes > 0 ? Math.round((totalAttendance / totalAthletes) * 10) / 10 : 0.0;

    // Séance du jour ou prochaine séance
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);
    const currentYearStr = todayStr.slice(0, 4);
    const nextSession = dbStore.sessions.find((s) => s.date >= todayStr) || dbStore.sessions[0];

    // Derniers records personnels battus
    const recentRecords = dbStore.swimmingTimes
      .filter((t) => t.isPersonalBest)
      .slice(0, 5);

    // Répartition par groupe
    const groupMap: { [key: string]: number } = {};
    for (const ath of dbStore.athletes) {
      groupMap[ath.groupName] = (groupMap[ath.groupName] || 0) + 1;
    }

    const groupDistribution = Object.keys(groupMap).map((k) => ({
      groupName: k,
      count: groupMap[k],
    }));

    // Calcul des heures d'entraînement (Jour, Mois, Année)
    let hoursToday = 0;
    let hoursThisMonth = 0;
    let hoursThisYear = 0;
    let sessionsTodayCount = 0;

    for (const sess of dbStore.sessions) {
      const dur = calculateSessionHours(sess.startTime, sess.endTime);
      if (sess.date === todayStr) {
        hoursToday += dur;
        sessionsTodayCount++;
      }
      if (sess.date.startsWith(currentMonthStr)) {
        hoursThisMonth += dur;
      }
      if (sess.date.startsWith(currentYearStr)) {
        hoursThisYear += dur;
      }
    }

    const totalCoaches = dbStore.users.filter((u) => u.role === 'COACH').length;
    const totalGroups = dbStore.groups.length;

    return res.json({
      success: true,
      data: {
        totalAthletes,
        totalCoaches,
        totalGroups,
        averageAttendanceRate,
        nextSession,
        recentRecords,
        groupDistribution,
        trainingHours: {
          today: Math.round(hoursToday * 10) / 10,
          thisMonth: Math.round(hoursThisMonth * 10) / 10,
          thisYear: Math.round(hoursThisYear * 10) / 10,
          sessionsTodayCount,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Obtenir les statistiques détaillées des heures d'entraînement (Par Jour, Par Mois, Par Année)
export const getTrainingHoursStats = (req: Request, res: Response) => {
  try {
    const { athleteId, groupName, coachGroup, coachGroups, year } = req.query;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = year ? Number(year) : now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let eligibleSessions = [...dbStore.sessions];

    // Filtrer par groupe(s) si demandé
    const groupsFilter: string[] = [];
    if (coachGroups) {
      const parsed = Array.isArray(coachGroups) ? coachGroups : String(coachGroups).split(',');
      groupsFilter.push(...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    } else if (coachGroup && coachGroup !== 'Tous' && coachGroup !== 'Tous les groupes') {
      const parsed = String(coachGroup).split(',');
      groupsFilter.push(...parsed.map((g) => g.trim()).filter((g) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    }

    if (groupsFilter.length > 0) {
      eligibleSessions = eligibleSessions.filter((s) => groupsFilter.includes(s.groupName));
    }

    if (groupName && groupName !== 'Tous') {
      eligibleSessions = eligibleSessions.filter((s) => s.groupName === String(groupName));
    }

    // Si on demande les statistiques d'un nageur spécifique (heures où il était présent)
    if (athleteId) {
      const athleteAttendances = dbStore.attendances.filter(
        (a) => a.athleteId === athleteId && (a.status === 'PRESENT' || a.status === 'LATE')
      );
      const attendedSessionIds = new Set(athleteAttendances.map((a) => a.sessionId));
      eligibleSessions = eligibleSessions.filter((s) => attendedSessionIds.has(s.id));
    }

    // Totaux cumulés
    let hoursToday = 0;
    let hoursThisMonth = 0;
    let hoursThisYear = 0;
    let totalAllTime = 0;
    let sessionsTodayCount = 0;
    let sessionsThisMonthCount = 0;
    let sessionsThisYearCount = 0;

    for (const sess of eligibleSessions) {
      const dur = calculateSessionHours(sess.startTime, sess.endTime);
      totalAllTime += dur;

      if (sess.date === todayStr) {
        hoursToday += dur;
        sessionsTodayCount++;
      }
      if (sess.date.startsWith(currentMonthStr)) {
        hoursThisMonth += dur;
        sessionsThisMonthCount++;
      }
      if (sess.date.startsWith(String(currentYear))) {
        hoursThisYear += dur;
        sessionsThisYearCount++;
      }
    }

    hoursToday = Math.round(hoursToday * 10) / 10;
    hoursThisMonth = Math.round(hoursThisMonth * 10) / 10;
    hoursThisYear = Math.round(hoursThisYear * 10) / 10;
    totalAllTime = Math.round(totalAllTime * 10) / 10;

    // 1. Découpage journalier (Les 7 derniers jours glissants)
    const dayNamesFr = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dailyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayName = dayNamesFr[d.getDay()];

      const daySessions = eligibleSessions.filter((s) => s.date === dateString);
      const dayHours = daySessions.reduce((acc, s) => acc + calculateSessionHours(s.startTime, s.endTime), 0);

      dailyBreakdown.push({
        date: dateString,
        dayName,
        label: `${dayName} ${d.getDate()}`,
        hours: Math.round(dayHours * 10) / 10,
        sessionCount: daySessions.length,
      });
    }

    // 2. Découpage mensuel (12 mois de l'année)
    const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyBreakdown = [];
    for (let m = 1; m <= 12; m++) {
      const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
      const monthSessions = eligibleSessions.filter((s) => s.date.startsWith(mStr));
      const monthHours = monthSessions.reduce((acc, s) => acc + calculateSessionHours(s.startTime, s.endTime), 0);

      monthlyBreakdown.push({
        month: mStr,
        monthNumber: m,
        monthName: monthNamesFr[m - 1],
        hours: Math.round(monthHours * 10) / 10,
        sessionCount: monthSessions.length,
      });
    }

    // 3. Découpage annuel
    const yearMap: { [y: string]: { hours: number; count: number } } = {};
    for (const sess of eligibleSessions) {
      const y = sess.date.split('-')[0] || String(currentYear);
      const dur = calculateSessionHours(sess.startTime, sess.endTime);
      if (!yearMap[y]) {
        yearMap[y] = { hours: 0, count: 0 };
      }
      yearMap[y].hours += dur;
      yearMap[y].count += 1;
    }

    if (!yearMap[String(currentYear)]) {
      yearMap[String(currentYear)] = { hours: 0, count: 0 };
    }

    const yearlyBreakdown = Object.keys(yearMap)
      .sort()
      .map((y) => ({
        year: Number(y),
        hours: Math.round(yearMap[y].hours * 10) / 10,
        sessionCount: yearMap[y].count,
      }));

    return res.json({
      success: true,
      data: {
        summary: {
          today: hoursToday,
          thisMonth: hoursThisMonth,
          thisYear: hoursThisYear,
          totalAllTime,
          sessionsToday: sessionsTodayCount,
          sessionsThisMonth: sessionsThisMonthCount,
          sessionsThisYear: sessionsThisYearCount,
        },
        dailyBreakdown,
        monthlyBreakdown,
        yearlyBreakdown,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

