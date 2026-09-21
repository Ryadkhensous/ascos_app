export interface AthleteData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  category: string;
  licenseNumber?: string;
  emergencyContact?: string;
  photoUrl?: string;
  groupName: string;
  coachId?: string;
  coachName?: string;
  attendanceRate: number;
  totalSessions: number;
  attendedSessions: number;
}

export interface SessionData {
  id: string;
  groupName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  poolType: 'POOL_25M' | 'POOL_50M';
  focus: string;
  location: string;
}

export interface AttendanceData {
  id: string;
  sessionId: string;
  athleteId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  notes?: string;
  updatedAt: string;
}

export interface SwimmingTimeData {
  id: string;
  athleteId: string;
  athleteName: string;
  stroke: 'FREESTYLE' | 'BACKSTROKE' | 'BREASTSTROKE' | 'BUTTERFLY' | 'MEDLEY';
  distance: number;
  poolType: 'POOL_25M' | 'POOL_50M';
  timeInMs: number;
  isPersonalBest: boolean;
  date: string;
  competition: string;
  reactionTimeMs?: number;
  notes?: string;
}

export interface UserData {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'COACH' | 'ATHLETE';
  phone?: string;
  assignedGroup?: string;
  assignedGroups?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TrainingGroupData {
  id: string;
  name: string;
  description?: string;
  coachId?: string;
  coachName?: string;
  createdAt: string;
  updatedAt: string;
}

// Données réalistes par défaut pour le club de natation ASCOS
export class AscosStore {
  public users: UserData[] = [
    {
      id: 'user-admin-1',
      email: 'admin@ascos.fr',
      // Hash de 'password123'
      passwordHash: '$2a$10$UwI7S1UeFWfIFc2ObbEy7eOP14J.txnNDmDIgBJndesbrGtnRoReq',
      firstName: 'Administrateur',
      lastName: 'ASCOS',
      role: 'ADMIN',
      phone: '+33 1 23 45 67 89',
      assignedGroup: 'Tous les groupes',
      assignedGroups: ['Tous les groupes'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'user-coach-1',
      email: 'coach@ascos.fr',
      // Hash de 'password123'
      passwordHash: '$2a$10$UwI7S1UeFWfIFc2ObbEy7eOP14J.txnNDmDIgBJndesbrGtnRoReq',
      firstName: 'Thomas',
      lastName: 'Dubois',
      role: 'COACH',
      phone: '+33 6 12 34 56 78',
      assignedGroup: 'Groupe Élite, Groupe Performance',
      assignedGroups: ['Groupe Élite', 'Groupe Performance'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'user-coach-2',
      email: 'sophie.coach@ascos.fr',
      // Hash de 'password123'
      passwordHash: '$2a$10$UwI7S1UeFWfIFc2ObbEy7eOP14J.txnNDmDIgBJndesbrGtnRoReq',
      firstName: 'Sophie',
      lastName: 'Bernard',
      role: 'COACH',
      phone: '+33 6 98 76 54 32',
      assignedGroup: 'Groupe Espoirs, École de Natation',
      assignedGroups: ['Groupe Espoirs', 'École de Natation'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  public groups: TrainingGroupData[] = [
    {
      id: 'grp-elite',
      name: 'Groupe Élite',
      description: 'Nageurs de niveau national et international (cadences élevées, travail au centième)',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'grp-perf',
      name: 'Groupe Performance',
      description: 'Nageurs régionaux et interrégionaux visant les qualifications nationales',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'grp-espoirs',
      name: 'Groupe Espoirs',
      description: 'Jeunes talents en perfectionnement technique des 4 nages et départs/virages',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'grp-ecole',
      name: 'École de Natation',
      description: 'Apprentissage et validation du Sauv\'nage et du Pass\'sports de l\'eau',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  public athletes: AthleteData[] = [
    {
      id: 'ath-1',
      firstName: 'Maxime',
      lastName: 'Leroy',
      dateOfBirth: '2007-04-12',
      gender: 'MALE',
      category: 'Juniors (15-18 ans)',
      licenseNumber: 'FFN-184920',
      emergencyContact: '06 11 22 33 44',
      groupName: 'Groupe Élite',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 95.5,
      totalSessions: 22,
      attendedSessions: 21,
    },
    {
      id: 'ath-2',
      firstName: 'Sarah',
      lastName: 'Benali',
      dateOfBirth: '2008-09-24',
      gender: 'FEMALE',
      category: 'Juniors (15-18 ans)',
      licenseNumber: 'FFN-392817',
      emergencyContact: '06 22 33 44 55',
      groupName: 'Groupe Élite',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 91.0,
      totalSessions: 22,
      attendedSessions: 20,
    },
    {
      id: 'ath-3',
      firstName: 'Lucas',
      lastName: 'Dupont',
      dateOfBirth: '2006-02-18',
      gender: 'MALE',
      category: 'Séniors & Maîtres (19+ ans)',
      licenseNumber: 'FFN-729401',
      emergencyContact: '07 33 44 55 66',
      groupName: 'Groupe Élite',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 100.0,
      totalSessions: 22,
      attendedSessions: 22,
    },
    {
      id: 'ath-4',
      firstName: 'Emma',
      lastName: 'Martin',
      dateOfBirth: '2009-07-15',
      gender: 'FEMALE',
      category: 'Jeunes (11-14 ans)',
      licenseNumber: 'FFN-510294',
      emergencyContact: '06 44 55 66 77',
      groupName: 'Groupe Performance',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 90.0,
      totalSessions: 20,
      attendedSessions: 18,
    },
    {
      id: 'ath-5',
      firstName: 'Alexandre',
      lastName: 'Petit',
      dateOfBirth: '2010-11-03',
      gender: 'MALE',
      category: 'Jeunes (11-14 ans)',
      licenseNumber: 'FFN-629481',
      emergencyContact: '06 55 66 77 88',
      groupName: 'Groupe Performance',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 95.0,
      totalSessions: 20,
      attendedSessions: 19,
    },
    {
      id: 'ath-6',
      firstName: 'Léa',
      lastName: 'Roux',
      dateOfBirth: '2011-05-19',
      gender: 'FEMALE',
      category: 'Jeunes (11-14 ans)',
      licenseNumber: 'FFN-847291',
      emergencyContact: '06 66 77 88 99',
      groupName: 'Groupe Performance',
      coachId: 'user-coach-1',
      coachName: 'Thomas Dubois',
      attendanceRate: 85.0,
      totalSessions: 20,
      attendedSessions: 17,
    },
    {
      id: 'ath-7',
      firstName: 'Hugo',
      lastName: 'Bertrand',
      dateOfBirth: '2012-08-30',
      gender: 'MALE',
      category: 'Jeunes (11-14 ans)',
      licenseNumber: 'FFN-918273',
      emergencyContact: '06 77 88 99 00',
      groupName: 'Groupe Espoirs',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 90.0,
      totalSessions: 18,
      attendedSessions: 16,
    },
    {
      id: 'ath-8',
      firstName: 'Chloé',
      lastName: 'Mercier',
      dateOfBirth: '2013-01-14',
      gender: 'FEMALE',
      category: 'Jeunes (11-14 ans)',
      licenseNumber: 'FFN-382910',
      emergencyContact: '07 88 99 00 11',
      groupName: 'Groupe Espoirs',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 94.4,
      totalSessions: 18,
      attendedSessions: 17,
    },
    {
      id: 'ath-9',
      firstName: 'Enzo',
      lastName: 'Garcia',
      dateOfBirth: '2014-06-22',
      gender: 'MALE',
      category: 'Avenirs (< 11 ans)',
      licenseNumber: 'FFN-472918',
      emergencyContact: '06 99 00 11 22',
      groupName: 'Groupe Espoirs',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 100.0,
      totalSessions: 18,
      attendedSessions: 18,
    },
    {
      id: 'ath-10',
      firstName: 'Manon',
      lastName: 'Fournier',
      dateOfBirth: '2015-03-09',
      gender: 'FEMALE',
      category: 'Avenirs (< 11 ans)',
      licenseNumber: 'FFN-192837',
      emergencyContact: '06 00 11 22 33',
      groupName: 'École de Natation',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 85.7,
      totalSessions: 14,
      attendedSessions: 12,
    },
    {
      id: 'ath-11',
      firstName: 'Gabriel',
      lastName: 'Vincent',
      dateOfBirth: '2016-09-17',
      gender: 'MALE',
      category: 'Avenirs (< 11 ans)',
      licenseNumber: 'FFN-561928',
      emergencyContact: '07 11 22 33 44',
      groupName: 'École de Natation',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 92.8,
      totalSessions: 14,
      attendedSessions: 13,
    },
    {
      id: 'ath-12',
      firstName: 'Inès',
      lastName: 'Morel',
      dateOfBirth: '2015-12-01',
      gender: 'FEMALE',
      category: 'Avenirs (< 11 ans)',
      licenseNumber: 'FFN-819203',
      emergencyContact: '06 22 33 44 55',
      groupName: 'École de Natation',
      coachId: 'user-coach-2',
      coachName: 'Sophie Bernard',
      attendanceRate: 100.0,
      totalSessions: 14,
      attendedSessions: 14,
    },
  ];

  public sessions: SessionData[] = [
    {
      id: 'sess-today-1',
      groupName: 'Groupe Élite',
      title: 'Aérobie & Allures de Compétition',
      date: new Date().toISOString().split('T')[0],
      startTime: '18:00',
      endTime: '20:00',
      poolType: 'POOL_50M',
      focus: 'Vitesse & Cadences',
      location: 'Bassin Olympique (50m)',
    },
    {
      id: 'sess-today-2',
      groupName: 'Groupe Performance',
      title: 'Technique 4 Nages & Virages',
      date: new Date().toISOString().split('T')[0],
      startTime: '19:00',
      endTime: '20:30',
      poolType: 'POOL_25M',
      focus: 'Virages & Coulées',
      location: 'Bassin d\'entraînement (25m)',
    },
    {
      id: 'sess-next-1',
      groupName: 'Groupe Espoirs',
      title: 'Perfectionnement Nage Libre & Dos',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      startTime: '17:30',
      endTime: '19:00',
      poolType: 'POOL_25M',
      focus: 'Technique de nage',
      location: 'Bassin d\'entraînement (25m)',
    },
    {
      id: 'sess-past-1',
      groupName: 'Groupe Élite',
      title: 'Test Chronométré 50m / 100m',
      date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      startTime: '18:00',
      endTime: '20:00',
      poolType: 'POOL_50M',
      focus: 'Chronométrage Officiel',
      location: 'Bassin Olympique (50m)',
    },
  ];

  public attendances: AttendanceData[] = [
    { id: 'att-1', sessionId: 'sess-today-1', athleteId: 'ath-1', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-2', sessionId: 'sess-today-1', athleteId: 'ath-2', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-3', sessionId: 'sess-today-1', athleteId: 'ath-3', status: 'LATE', notes: 'Retard de 10 min (transport)', updatedAt: new Date().toISOString() },
    { id: 'att-4', sessionId: 'sess-today-2', athleteId: 'ath-4', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-5', sessionId: 'sess-today-2', athleteId: 'ath-5', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-6', sessionId: 'sess-today-2', athleteId: 'ath-6', status: 'EXCUSED', notes: 'Certificat médical', updatedAt: new Date().toISOString() },
    { id: 'att-7', sessionId: 'sess-past-1', athleteId: 'ath-1', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-8', sessionId: 'sess-past-1', athleteId: 'ath-2', status: 'PRESENT', updatedAt: new Date().toISOString() },
    { id: 'att-9', sessionId: 'sess-past-1', athleteId: 'ath-3', status: 'PRESENT', updatedAt: new Date().toISOString() },
  ];

  public swimmingTimes: SwimmingTimeData[] = [
    // Progression Maxime Leroy (ath-1) sur 50m Nage Libre
    {
      id: 't-1',
      athleteId: 'ath-1',
      athleteName: 'Maxime Leroy',
      stroke: 'FREESTYLE',
      distance: 50,
      poolType: 'POOL_50M',
      timeInMs: 26200, // 26.20s
      isPersonalBest: false,
      date: '2025-10-15',
      competition: 'Meeting de Rentrée',
      notes: 'Début de saison',
    },
    {
      id: 't-2',
      athleteId: 'ath-1',
      athleteName: 'Maxime Leroy',
      stroke: 'FREESTYLE',
      distance: 50,
      poolType: 'POOL_50M',
      timeInMs: 25700, // 25.70s
      isPersonalBest: false,
      date: '2025-12-10',
      competition: 'Championnat Départemental',
      notes: 'Bonne coulée',
    },
    {
      id: 't-3',
      athleteId: 'ath-1',
      athleteName: 'Maxime Leroy',
      stroke: 'FREESTYLE',
      distance: 50,
      poolType: 'POOL_50M',
      timeInMs: 25150, // 25.15s
      isPersonalBest: false,
      date: '2026-01-20',
      competition: 'Meeting Régional',
      notes: 'Gain au virage',
    },
    {
      id: 't-4',
      athleteId: 'ath-1',
      athleteName: 'Maxime Leroy',
      stroke: 'FREESTYLE',
      distance: 50,
      poolType: 'POOL_50M',
      timeInMs: 24800, // 24.80s (Record Personnel)
      isPersonalBest: true,
      date: '2026-02-28',
      competition: 'Meeting National Open',
      notes: 'Qualifié France Juniors',
    },
    // Sarah Benali
    {
      id: 't-5',
      athleteId: 'ath-2',
      athleteName: 'Sarah Benali',
      stroke: 'BUTTERFLY',
      distance: 100,
      poolType: 'POOL_50M',
      timeInMs: 64200, // 01:04.20
      isPersonalBest: true,
      date: '2026-02-15',
      competition: 'Championnat Régional',
    },
    // Lucas Dupont
    {
      id: 't-6',
      athleteId: 'ath-3',
      athleteName: 'Lucas Dupont',
      stroke: 'BREASTSTROKE',
      distance: 100,
      poolType: 'POOL_50M',
      timeInMs: 66800, // 01:06.80
      isPersonalBest: true,
      date: '2026-02-20',
      competition: 'Meeting National',
    },
    // Emma Martin
    {
      id: 't-7',
      athleteId: 'ath-4',
      athleteName: 'Emma Martin',
      stroke: 'BACKSTROKE',
      distance: 100,
      poolType: 'POOL_25M',
      timeInMs: 69400, // 01:09.40
      isPersonalBest: true,
      date: '2026-01-18',
      competition: 'Coupe Départementale',
    },
    // Alexandre Petit
    {
      id: 't-8',
      athleteId: 'ath-5',
      athleteName: 'Alexandre Petit',
      stroke: 'MEDLEY',
      distance: 200,
      poolType: 'POOL_25M',
      timeInMs: 142500, // 02:22.50
      isPersonalBest: true,
      date: '2026-02-10',
      competition: 'Interclubs Régionaux',
    },
  ];

  // Trouver ou recalculer si un temps est le meilleur temps personnel (PB)
  public checkAndSetPersonalBest(newTime: SwimmingTimeData): boolean {
    const existingTimes = this.swimmingTimes.filter(
      (t) =>
        t.athleteId === newTime.athleteId &&
        t.stroke === newTime.stroke &&
        t.distance === newTime.distance &&
        t.poolType === newTime.poolType
    );

    if (existingTimes.length === 0) {
      newTime.isPersonalBest = true;
      return true;
    }

    const currentBest = Math.min(...existingTimes.map((t) => t.timeInMs));
    if (newTime.timeInMs < currentBest) {
      // Déchoir l'ancien record
      existingTimes.forEach((t) => (t.isPersonalBest = false));
      newTime.isPersonalBest = true;
      return true;
    } else {
      newTime.isPersonalBest = false;
      return false;
    }
  }
}

export const dbStore = new AscosStore();
