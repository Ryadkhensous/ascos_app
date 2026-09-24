import { Router } from 'express';
import {
  getAthletes,
  getAthleteById,
  createAthlete,
  createAthletesBatch,
  importExcelAthletes,
  getExcelTemplate,
  updateAthlete,
  deleteAthlete,
  clearAllAthletes,
} from '../controllers/athlete.controller';
import {
  getSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  generateDailySessions,
} from '../controllers/session.controller';
import {
  markAttendance,
  saveBatchAttendance,
  getSessionAttendance,
  getAttendanceStats,
  getAttendanceHistory,
  exportAttendanceCsv,
  deleteAttendance,
  updateAttendance,
} from '../controllers/attendance.controller';
import {
  recordTime,
  getAllTimes,
  getTimeById,
  getAthleteTimes,
  getClubRecords,
  getCompetitions,
  updateTime,
  deleteTime,
} from '../controllers/time.controller';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../controllers/group.controller';
import {
  register,
  login,
  getMe,
  getUsers,
  updateUser,
  deleteUser,
} from '../controllers/auth.controller';
import { getDashboardStats, getTrainingHoursStats } from '../controllers/stats.controller';
import {
  getDatabaseDump,
  downloadDatabaseBackup,
  renderDatabaseViewer,
  resetDatabase,
  restoreDatabaseBackup,
} from '../controllers/database.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// ==========================================
// 🩺 Health Check (/api/health)
// ==========================================
router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', server: 'ASCOS Backend', timestamp: new Date().toISOString() });
});

// ==========================================
// 🗄️ Base de Données & Sauvegarde (/api/database)
// ==========================================
router.get('/database', renderDatabaseViewer);
router.get('/database/dump', getDatabaseDump);
router.get('/database/backup.json', downloadDatabaseBackup);
router.post('/database/reset', resetDatabase);
router.post('/database/restore', restoreDatabaseBackup);

// ==========================================
// 🔐 Authentification & Utilisateurs (/api/auth)
// ==========================================
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', verifyToken, getMe);
router.get('/auth/users', getUsers);
router.put('/auth/users/:id', updateUser);
router.delete('/auth/users/:id', deleteUser);

// ==========================================
// 🏊 Groupes d'entraînement (/api/groups)
// ==========================================
router.get('/groups', getGroups);
router.get('/groups/:id', getGroupById);
router.post('/groups', createGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

// ==========================================
// 👥 Athlètes (/api/athletes)
// ==========================================
router.get('/athletes', getAthletes);
router.get('/athletes/template-excel', getExcelTemplate);
router.post('/athletes/import-excel', importExcelAthletes);
router.post('/athletes/batch', createAthletesBatch);
router.delete('/athletes/all', clearAllAthletes);
router.get('/athletes/:id', getAthleteById);
router.post('/athletes', createAthlete);
router.put('/athletes/:id', updateAthlete);
router.delete('/athletes/:id', deleteAthlete);

// ==========================================
// 📅 Séances d'entraînement (/api/sessions)
// ==========================================
router.get('/sessions', getSessions);
router.post('/sessions/generate-daily', generateDailySessions);
router.get('/sessions/:id', getSessionById);
router.post('/sessions', createSession);
router.put('/sessions/:id', updateSession);
router.delete('/sessions/:id', deleteSession);

// ==========================================
// 📋 Assiduité & Pointage (/api/attendance)
// ==========================================
router.post('/attendance/mark', markAttendance);
router.post('/attendance/batch', saveBatchAttendance);
router.get('/attendance/session/:sessionId', getSessionAttendance);
router.get('/attendance/stats', getAttendanceStats);
router.get('/attendance/history', getAttendanceHistory);
router.get('/attendance/export/csv', exportAttendanceCsv);
router.put('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

// ==========================================
// ⏱️ Chronomètres & Records (/api/times)
// ==========================================
router.post('/times', recordTime);
router.get('/times', getAllTimes);
router.get('/times/records', getClubRecords);
router.get('/times/competitions', getCompetitions);
router.get('/times/athlete/:athleteId', getAthleteTimes);
router.get('/times/:id', getTimeById);
router.put('/times/:id', updateTime);
router.delete('/times/:id', deleteTime);

// ==========================================
// 📊 Tableau de bord Coach & Volume Horaire (/api/stats)
// ==========================================
router.get('/stats/dashboard', getDashboardStats);
router.get('/stats/hours', getTrainingHoursStats);

export default router;
