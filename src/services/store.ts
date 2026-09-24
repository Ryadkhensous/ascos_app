import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

function resolveDataPaths(): { dataDir: string; dataFile: string } {
  const candidateDirs = [
    path.resolve(__dirname, '../../data'),
    path.resolve(__dirname, '../data'),
    path.resolve(process.cwd(), 'ascos-backend/data'),
    path.resolve(process.cwd(), 'data'),
  ];
  for (const dir of candidateDirs) {
    const file = path.join(dir, 'ascos_store.json');
    if (fs.existsSync(file)) {
      return { dataDir: dir, dataFile: file };
    }
  }
  // Dossier par défaut : ascos-backend/data
  const fallbackDir = path.resolve(__dirname, '../../data');
  return { dataDir: fallbackDir, dataFile: path.join(fallbackDir, 'ascos_store.json') };
}

const { dataDir: DATA_DIR, dataFile: DATA_FILE } = resolveDataPaths();

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
  username?: string;
  email?: string;
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
      username: 'admin',
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

  public pgPool: Pool | null = null;
  public isPgConnected: boolean = false;
  public pgStatusText: string = 'Mode Stockage Fichier Local (JSON)';

  constructor() {
    this.loadFromFile();
    this.initPostgres();
  }

  public async initPostgres(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !dbUrl.startsWith('postgres')) {
      this.isPgConnected = false;
      this.pgStatusText = 'Mode Stockage Fichier Local (JSON)';
      return;
    }

    try {
      this.pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS ascos_cloud_store (
            id VARCHAR(50) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        const res = await client.query(`SELECT data FROM ascos_cloud_store WHERE id = 'main' LIMIT 1;`);
        if (res.rows.length > 0 && res.rows[0].data) {
          const cloudData = res.rows[0].data;
          if (Array.isArray(cloudData.users) && cloudData.users.length > 0) this.users = cloudData.users;
          if (Array.isArray(cloudData.groups) && cloudData.groups.length > 0) this.groups = cloudData.groups;
          if (Array.isArray(cloudData.athletes)) this.athletes = cloudData.athletes;
          if (Array.isArray(cloudData.sessions)) this.sessions = cloudData.sessions;
          if (Array.isArray(cloudData.attendances)) this.attendances = cloudData.attendances;
          if (Array.isArray(cloudData.swimmingTimes)) this.swimmingTimes = cloudData.swimmingTimes;

          console.log(`🌐 [PostgreSQL Cloud] Synchronisé avec succès (${this.athletes.length} athlètes, ${this.sessions.length} séances).`);
          this.saveToFileOnly();
        } else {
          // La table cloud est vierge : on sauvegarde nos données initiales dans PostgreSQL
          const payload = {
            users: this.users,
            groups: this.groups,
            athletes: this.athletes,
            sessions: this.sessions,
            attendances: this.attendances,
            swimmingTimes: this.swimmingTimes,
          };
          await client.query(
            `INSERT INTO ascos_cloud_store (id, data, updated_at) VALUES ('main', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();`,
            [payload]
          );
          console.log(`🌐 [PostgreSQL Cloud] Table initialisée avec les données actuelles.`);
        }

        this.isPgConnected = true;
        this.pgStatusText = 'Base PostgreSQL Cloud Connectée & Active (Persistance 100%)';
        this.startKeepAlive();
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('ℹ️ PostgreSQL non disponible (repli sur stockage fichier JSON local) :', err.message);
      this.isPgConnected = false;
      this.pgStatusText = 'Mode Fichier Local (JSON)';
    }
  }

  private keepAliveInterval: NodeJS.Timeout | null = null;

  // Empêche Neon de passer en veille en envoyant un ping léger toutes les 4 minutes
  private startKeepAlive(): void {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(async () => {
      if (this.isPgConnected && this.pgPool) {
        try {
          await this.pgPool.query('SELECT 1;');
          console.log('💓 [Keep-Alive] Ping PostgreSQL Neon réussi (veille évitée).');
        } catch (err: any) {
          console.warn('⚠️ [Keep-Alive] Ping Neon :', err.message);
        }
      }
    }, 4 * 60 * 1000);
  }

  public saveToFile(): void {
    this.saveToFileOnly();
    this.saveToPostgresAsync();
  }

  private saveToFileOnly(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const payload = {
        users: this.users,
        groups: this.groups,
        athletes: this.athletes,
        sessions: this.sessions,
        attendances: this.attendances,
        swimmingTimes: this.swimmingTimes,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`💾 Données sauvegardées dans ${DATA_FILE} (${this.athletes.length} athlètes, ${this.users.length} comptes)`);
    } catch (err) {
      console.warn('⚠️ Impossible de sauvegarder ascos_store.json :', err);
    }
  }

  private async saveToPostgresAsync(): Promise<void> {
    if (!this.isPgConnected || !this.pgPool) return;
    try {
      const payload = {
        users: this.users,
        groups: this.groups,
        athletes: this.athletes,
        sessions: this.sessions,
        attendances: this.attendances,
        swimmingTimes: this.swimmingTimes,
      };
      await this.pgPool.query(
        `INSERT INTO ascos_cloud_store (id, data, updated_at) VALUES ('main', $1, NOW()) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW();`,
        [payload]
      );
      console.log(`☁️ [PostgreSQL Cloud] Données sauvegardées en ligne avec succès.`);
    } catch (err: any) {
      console.warn('⚠️ Erreur sauvegarde PostgreSQL Cloud :', err.message);
    }
  }

  public loadFromFile(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.users) && parsed.users.length > 0) this.users = parsed.users;
        if (Array.isArray(parsed.groups) && parsed.groups.length > 0) this.groups = parsed.groups;
        if (Array.isArray(parsed.athletes)) this.athletes = parsed.athletes;
        if (Array.isArray(parsed.sessions)) this.sessions = parsed.sessions;
        if (Array.isArray(parsed.attendances)) this.attendances = parsed.attendances;
        if (Array.isArray(parsed.swimmingTimes)) this.swimmingTimes = parsed.swimmingTimes;
        console.log(`💾 Données ASCOS chargées depuis ${DATA_FILE} (${this.athletes.length} athlètes, ${this.groups.length} groupes, ${this.users.length} utilisateurs)`);
      } else {
        console.log(`ℹ️ Aucun fichier existant sur ${DATA_FILE}, initialisation avec données par défaut.`);
      }
    } catch (err) {
      console.warn('⚠️ Impossible de lire ascos_store.json :', err);
    }
  }

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
