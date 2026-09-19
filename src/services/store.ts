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

  public athletes: AthleteData[] = [];

  public sessions: SessionData[] = [];

  public attendances: AttendanceData[] = [];

  public swimmingTimes: SwimmingTimeData[] = [];

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
