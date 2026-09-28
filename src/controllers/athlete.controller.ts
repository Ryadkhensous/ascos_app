import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { dbStore, AthleteData } from '../services/store';

// Table de correspondance des mois en français
const MONTHS_FR: Record<string, string> = {
  janv: '01', janvier: '01',
  fevr: '02', fevrier: '02', févr: '02', février: '02',
  mars: '03',
  avril: '04', avr: '04',
  mai: '05',
  juin: '06',
  juil: '07', juillet: '07',
  aout: '08', août: '08',
  sept: '09', septembre: '09',
  oct: '10', octobre: '10',
  nov: '11', novembre: '11',
  dec: '12', decembre: '12', déc: '12', décembre: '12',
};

// Déduire une date de naissance réaliste selon la catégorie sportive si manquante
export function inferDobFromCategory(cat?: string, currentYear?: number): string {
  const y = currentYear || new Date().getFullYear();
  if (!cat) return `${y - 14}-01-01`;

  const c = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (c.includes('ecole') || c.includes('sauv') || c.includes('pass')) {
    return `${y - 8}-01-01`; // ~8 ans
  }
  if (c.includes('avenir') || c.includes('poussin')) {
    return `${y - 10}-01-01`; // ~10 ans
  }
  if (c.includes('benjamin')) {
    return `${y - 12}-01-01`; // ~12 ans
  }
  if (c.includes('minime')) {
    return `${y - 14}-01-01`; // ~14 ans
  }
  if (c.includes('cadet')) {
    return `${y - 16}-01-01`; // ~16 ans
  }
  if (c.includes('junior')) {
    return `${y - 18}-01-01`; // ~18 ans
  }
  if (c.includes('senior') || c.includes('maitre') || c.includes('master') || c.includes('elite')) {
    return `${y - 21}-01-01`; // ~21 ans
  }
  if (c.includes('espoir')) {
    return `${y - 12}-01-01`; // ~12 ans
  }
  return `${y - 14}-01-01`;
}

// Fonction utilitaire ultra-robuste pour normaliser les dates d'Excel
export function parseExcelDate(val: any, categoryHint?: string, ageHint?: any): string {
  const currentYear = new Date().getFullYear();

  // Si un âge numérique explicite a été détecté et pas de date
  if ((val === undefined || val === null || val === '') && ageHint !== undefined && ageHint !== null && ageHint !== '') {
    const parsedAge = parseInt(String(ageHint), 10);
    if (!isNaN(parsedAge) && parsedAge >= 4 && parsedAge <= 90) {
      return `${currentYear - parsedAge}-01-01`;
    }
  }

  if (val === undefined || val === null || val === '') {
    return inferDobFromCategory(categoryHint, currentYear);
  }

  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
  }

  if (typeof val === 'number') {
    // 1. Année 4 chiffres (ex: 2012, 2015, 2008)
    if (val >= 1920 && val <= currentYear + 1) {
      return `${Math.floor(val)}-01-01`;
    }
    // 2. Année 2 chiffres (ex: 12, 14, 08, 99)
    if (val >= 0 && val <= 35) {
      return `20${String(Math.floor(val)).padStart(2, '0')}-01-01`;
    }
    if (val > 35 && val < 100) {
      return `19${Math.floor(val)}-01-01`;
    }
    // 3. Numéro de série de date Excel (ex: 41500 pour une date en 2013)
    if (val >= 10000 && val <= 65000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return inferDobFromCategory(categoryHint, currentYear);
  }

  const str = String(val).trim().replace(/\s+/g, ' ');
  if (!str) return inferDobFromCategory(categoryHint, currentYear);

  // Cas année pure 4 chiffres (ex: "2014")
  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    if (y >= 1920 && y <= currentYear + 1) {
      return `${y}-01-01`;
    }
  }

  // Cas année pure 2 chiffres (ex: "14", "08")
  if (/^\d{2}$/.test(str)) {
    const y = parseInt(str, 10);
    const fullY = y <= 35 ? 2000 + y : 1900 + y;
    return `${fullY}-01-01`;
  }

  // Formats DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const frMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (frMatch) {
    const day = frMatch[1].padStart(2, '0');
    const month = frMatch[2].padStart(2, '0');
    const year = frMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Formats DD/MM/YY ou DD-MM-YY (année sur 2 chiffres)
  const fr2Match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (fr2Match) {
    const day = fr2Match[1].padStart(2, '0');
    const month = fr2Match[2].padStart(2, '0');
    const y = parseInt(fr2Match[3], 10);
    const year = y <= 35 ? 2000 + y : 1900 + y;
    return `${year}-${month}-${day}`;
  }

  // Format ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Format avec nom de mois en français (ex: "15 mai 2012" ou "15-mai-2012")
  const textMonthMatch = str.match(/^(\d{1,2})[\s\-\.]([a-zA-Zéèû]+)[\s\-\.](\d{2,4})/);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthWord = textMonthMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let month = '01';
    for (const [key, num] of Object.entries(MONTHS_FR)) {
      if (monthWord.startsWith(key)) {
        month = num;
        break;
      }
    }
    let year = textMonthMatch[3];
    if (year.length === 2) {
      const y = parseInt(year, 10);
      year = String(y <= 35 ? 2000 + y : 1900 + y);
    }
    return `${year}-${month}-${day}`;
  }

  // Si une année 4 chiffres est présente dans la chaîne
  const anyYearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (anyYearMatch) {
    return `${anyYearMatch[1]}-01-01`;
  }

  return inferDobFromCategory(categoryHint, currentYear);
}

// Déterminer la catégorie d'âge sportive selon l'année de naissance
export function determineCategory(dob: string): string {
  try {
    const birthYear = parseInt(dob.split('-')[0], 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age <= 9) return 'École de Natation (< 10 ans)';
    if (age <= 11) return 'Avenirs (10-11 ans)';
    if (age <= 13) return 'Benjamins (12-13 ans)';
    if (age <= 15) return 'Minimes (14-15 ans)';
    if (age <= 17) return 'Cadets (16-17 ans)';
    if (age <= 19) return 'Juniors (18-19 ans)';
    return 'Séniors & Maîtres (20+ ans)';
  } catch (_) {
    return 'Juniors (15-18 ans)';
  }
}

export const getAthletes = (req: Request, res: Response) => {
  try {
    const { group, category, search, coachGroup, coachGroups, coachId } = req.query;

    // Auto-réparation des dates de naissance erronées (ex: 2010 pour Ecole ou Benjamin)
    const currentYear = new Date().getFullYear();
    let hasRepairs = false;
    for (const a of dbStore.athletes) {
      if ((a.dateOfBirth === '2010-01-01' || a.dateOfBirth.startsWith('1905') || !a.dateOfBirth) && a.category) {
        const catLower = a.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (catLower.includes('ecole') || catLower.includes('benjamin') || catLower.includes('minime') || catLower.includes('avenir') || catLower.includes('poussin')) {
          a.dateOfBirth = inferDobFromCategory(a.category, currentYear);
          hasRepairs = true;
        }
      }
    }
    if (hasRepairs) {
      dbStore.saveToFile();
    }

    let list = [...dbStore.athletes];

    // Isolation par groupe(s) d'entraîneur
    const groupsFilter: string[] = [];
    if (coachGroups) {
      const parsed = Array.isArray(coachGroups) ? coachGroups : String(coachGroups).split(',');
      groupsFilter.push(...parsed.map((g: any) => String(g).trim()).filter((g: string) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    } else if (coachGroup && coachGroup !== 'Tous' && coachGroup !== 'Tous les groupes') {
      const parsed = String(coachGroup).split(',');
      groupsFilter.push(...parsed.map((g) => g.trim()).filter((g) => g && g !== 'Tous' && g !== 'Tous les groupes'));
    }

    if (groupsFilter.length > 0) {
      list = list.filter((a) => groupsFilter.includes(a.groupName));
    } else if (coachId) {
      list = list.filter((a) => a.coachId === String(coachId));
    }

    if (group && group !== 'Tous') {
      list = list.filter((a) => a.groupName === group);
    }

    if (category && category !== 'Toutes') {
      list = list.filter((a) => a.category === category);
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (a) =>
          a.firstName.toLowerCase().includes(q) ||
          a.lastName.toLowerCase().includes(q) ||
          (a.licenseNumber && a.licenseNumber.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAthleteById = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const athlete = dbStore.athletes.find((a) => a.id === id);

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Athlète introuvable' });
    }

    const personalBests = dbStore.swimmingTimes.filter(
      (t) => t.athleteId === id && t.isPersonalBest
    );

    const allTimes = dbStore.swimmingTimes.filter((t) => t.athleteId === id);
    const attendances = dbStore.attendances.filter((att) => att.athleteId === id);

    return res.json({
      success: true,
      data: {
        ...athlete,
        personalBests,
        allTimes,
        attendances,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createAthlete = (req: Request, res: Response) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, category, groupName, licenseNumber, emergencyContact, coachId, coachName } = req.body;

    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({ success: false, message: 'Prénom, nom et date de naissance requis' });
    }

    const newAthlete: AthleteData = {
      id: `ath-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firstName,
      lastName,
      dateOfBirth: parseExcelDate(dateOfBirth),
      gender: gender || 'MALE',
      category: category || determineCategory(dateOfBirth),
      groupName: groupName || 'Groupe Performance',
      coachId,
      coachName,
      licenseNumber: licenseNumber || `FFN-${Math.floor(100000 + Math.random() * 900000)}`,
      emergencyContact,
      attendanceRate: 100.0,
      totalSessions: 0,
      attendedSessions: 0,
    };

    dbStore.athletes.unshift(newAthlete);
    dbStore.saveToFile();

    return res.status(201).json({ success: true, data: newAthlete });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Création en lot (Batch)
export const createAthletesBatch = (req: Request, res: Response) => {
  try {
    const { athletes } = req.body;
    if (!Array.isArray(athletes) || athletes.length === 0) {
      return res.status(400).json({ success: false, message: 'Tableau d\'athlètes requis' });
    }

    const added: AthleteData[] = [];
    for (const item of athletes) {
      if (!item.firstName || !item.lastName) continue;
      const dob = parseExcelDate(item.dateOfBirth);
      const ath: AthleteData = {
        id: `ath-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        firstName: item.firstName,
        lastName: item.lastName,
        dateOfBirth: dob,
        gender: item.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
        category: item.category || determineCategory(dob),
        groupName: item.groupName || 'Groupe Performance',
        coachId: item.coachId,
        coachName: item.coachName,
        licenseNumber: item.licenseNumber || `FFN-${Math.floor(100000 + Math.random() * 900000)}`,
        emergencyContact: item.emergencyContact,
        attendanceRate: 100.0,
        totalSessions: 0,
        attendedSessions: 0,
      };
      dbStore.athletes.push(ath);
      added.push(ath);
    }
    dbStore.saveToFile();

    return res.status(201).json({
      success: true,
      count: added.length,
      message: `${added.length} nageurs ajoutés avec succès`,
      data: added,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Assignation en lot d'athlètes à un entraîneur et/ou groupe
export const assignAthletesBatch = (req: Request, res: Response) => {
  try {
    const { athleteIds, coachId, coachName, groupName } = req.body;
    if (!Array.isArray(athleteIds) || athleteIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Liste d\'identifiants d\'athlètes requise' });
    }

    let updatedCount = 0;
    for (const id of athleteIds) {
      const athlete = dbStore.athletes.find((a) => a.id === id);
      if (athlete) {
        if (groupName !== undefined) athlete.groupName = groupName;
        if (coachId !== undefined) athlete.coachId = coachId || undefined;
        if (coachName !== undefined) athlete.coachName = coachName || undefined;
        updatedCount++;
      }
    }

    dbStore.saveToFile();
    return res.json({
      success: true,
      count: updatedCount,
      message: `${updatedCount} athlète(s) assigné(s) avec succès`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Importation directe depuis un fichier Excel (.xlsx, .xls) ou CSV en Base64
export const importExcelAthletes = (req: Request, res: Response) => {
  try {
    const { fileBase64, defaultGroup } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ success: false, message: 'Données de fichier base64 requises' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ success: false, message: 'Le fichier Excel ne contient aucune feuille' });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Le fichier Excel est vide' });
    }

    const added: AthleteData[] = [];
    const errors: string[] = [];

    // Correspondances de colonnes tolérantes
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Index Excel démarrant à la ligne 2

      // Détection des clés insensibles à la casse, aux accents et aux ponctuations
      let firstName = '';
      let lastName = '';
      let rawDob: any = null;
      let rawAge: any = null;
      let rawGender = '';
      let groupName = defaultGroup !== undefined ? defaultGroup : 'Non assigné';
      let category = '';
      let licenseNumber = '';
      let emergencyContact = '';
      let coachName = '';

      for (const key of Object.keys(row)) {
        const rawKey = key.trim();
        const cleanKey = rawKey
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        const compactKey = cleanKey.replace(/[^a-z0-9]/g, '');

        const val = row[key];
        const valStr = String(val !== undefined && val !== null ? val : '').trim();
        if (!valStr && val !== 0) continue;

        // 1. Prénom
        if (
          cleanKey.includes('prenom') ||
          compactKey === 'firstname' ||
          cleanKey === 'first name' ||
          cleanKey === 'fname'
        ) {
          firstName = valStr;
        }
        // 2. Nom de famille
        else if (
          cleanKey.includes('nom de famille') ||
          compactKey === 'lastname' ||
          cleanKey === 'last name' ||
          cleanKey.includes('famille') ||
          cleanKey === 'nom'
        ) {
          lastName = valStr;
        }
        // 3. Date / Année de Naissance (A.N, AN, D.N, DN, Date Naiss, Né le, etc.)
        else if (
          compactKey === 'an' ||
          compactKey === 'dn' ||
          compactKey === 'dob' ||
          compactKey === 'bday' ||
          cleanKey.includes('naiss') ||
          cleanKey.includes('naissance') ||
          cleanKey.includes('annee') ||
          cleanKey.includes('birth') ||
          cleanKey.startsWith('ne ') ||
          cleanKey.startsWith('nee ') ||
          cleanKey.includes('ne(e)') ||
          cleanKey === 'ne' ||
          cleanKey === 'nee' ||
          cleanKey === 'date' ||
          cleanKey === 'd.n' ||
          cleanKey === 'a.n' ||
          cleanKey === 'd.n.' ||
          cleanKey === 'a.n.'
        ) {
          rawDob = val;
        }
        // 4. Âge direct
        else if (cleanKey === 'age' || compactKey === 'age' || cleanKey.startsWith('age ')) {
          rawAge = val;
        }
        // 5. Genre / Sexe
        else if (
          cleanKey.includes('genre') ||
          cleanKey.includes('sexe') ||
          compactKey === 'gender' ||
          compactKey === 'sex' ||
          compactKey === 'sexe' ||
          cleanKey === 's' ||
          cleanKey === 'g'
        ) {
          rawGender = valStr;
        }
        // 6. Groupe d'entraînement
        else if (cleanKey.includes('groupe') || cleanKey.includes('group')) {
          groupName = valStr;
        }
        // 7. Catégorie sportive
        else if (cleanKey.includes('categorie') || cleanKey.includes('category') || compactKey === 'cat') {
          category = valStr;
        }
        // 8. Licence sportive (FFN / FAF)
        else if (
          cleanKey.includes('licence') ||
          cleanKey.includes('license') ||
          compactKey === 'ffn' ||
          compactKey === 'faf' ||
          cleanKey.includes('dossard')
        ) {
          licenseNumber = valStr;
        }
        // 9. Contact / Urgence
        else if (
          cleanKey.includes('urgence') ||
          cleanKey.includes('contact') ||
          cleanKey.includes('telephone') ||
          cleanKey.includes('tel') ||
          cleanKey === 'phone' ||
          cleanKey.includes('parent') ||
          cleanKey.includes('mobile')
        ) {
          emergencyContact = valStr;
        }
        // 10. Entraîneur
        else if (cleanKey.includes('entraineur') || cleanKey.includes('coach')) {
          coachName = valStr;
        }
      }

      // Cas où le prénom et le nom sont dans une seule colonne "Nom complet" / "Athlète"
      if (!firstName && !lastName) {
        for (const key of Object.keys(row)) {
          const cleanKey = key.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (cleanKey.includes('athlete') || cleanKey.includes('nageur') || cleanKey === 'nom et prenom' || cleanKey === 'nom prenom' || cleanKey === 'nom_prenom' || cleanKey === 'fullname' || cleanKey === 'full name') {
            const parts = String(row[key]).trim().split(/\s+/);
            if (parts.length >= 2) {
              firstName = parts[0];
              lastName = parts.slice(1).join(' ');
            } else if (parts.length === 1) {
              lastName = parts[0];
              firstName = '-';
            }
            break;
          }
        }
      }

      // Cas où un seul des deux est renseigné avec un espace (ex: "Lucas Bernard")
      if (firstName && !lastName && firstName.includes(' ')) {
        const parts = firstName.split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      } else if (!firstName && lastName && lastName.includes(' ')) {
        const parts = lastName.split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
      }

      if (!firstName || !lastName) {
        errors.push(`Ligne ${rowNum} ignorée : prénom ou nom manquant.`);
        continue;
      }

      const dob = parseExcelDate(rawDob, category, rawAge);

      // Détection Genre (Féminin ou Masculin)
      let gender: 'MALE' | 'FEMALE' = 'MALE';
      const gLower = rawGender.trim().toLowerCase();
      if (
        gLower.startsWith('f') ||
        gLower === 'femme' ||
        gLower === 'fille' ||
        gLower === 'féminin' ||
        gLower === 'feminin' ||
        gLower === 'female' ||
        gLower === 'w'
      ) {
        gender = 'FEMALE';
      } else if (!rawGender && firstName) {
        // Détection automatique pour prénoms féminins fréquents
        const fLower = firstName.trim().toLowerCase();
        const commonFemaleNames = [
          'yasmine', 'maria', 'mouna', 'lina', 'ines', 'nour', 'leila', 'sarah',
          'sara', 'amira', 'meriem', 'maryam', 'manel', 'chaima', 'sirine',
          'maya', 'selma', 'ryma', 'kenza', 'lydia', 'lea', 'emma', 'chloe',
          'camille', 'celia', 'nada', 'amel', 'amina', 'dounia'
        ];
        if (commonFemaleNames.includes(fLower)) {
          gender = 'FEMALE';
        }
      }

      // Associer l'entraîneur correspondant au groupe si coachName n'est pas spécifié
      let coachId: string | undefined = undefined;
      if (!coachName && groupName && groupName !== 'Non assigné' && groupName !== 'Sans groupe') {
        const matchingCoach = dbStore.users.find(
          (u) =>
            u.role === 'COACH' &&
            ((u.assignedGroups && u.assignedGroups.some((g) => g.toLowerCase() === groupName.toLowerCase())) ||
              (u.assignedGroup && u.assignedGroup.toLowerCase() === groupName.toLowerCase()))
        );
        if (matchingCoach) {
          coachName = `${matchingCoach.firstName} ${matchingCoach.lastName}`;
          coachId = matchingCoach.id;
        }
      } else if (coachName) {
        const matchingCoach = dbStore.users.find(
          (u) =>
            u.role === 'COACH' &&
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(coachName.toLowerCase())
        );
        if (matchingCoach) {
          coachId = matchingCoach.id;
        }
      }

      const newAthlete: AthleteData = {
        id: `ath-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        firstName,
        lastName,
        dateOfBirth: dob,
        gender,
        category: category || determineCategory(dob),
        groupName: groupName || 'Non assigné',
        coachId: coachId || undefined,
        coachName: coachName || undefined,
        licenseNumber: licenseNumber || `FFN-${Math.floor(100000 + Math.random() * 900000)}`,
        emergencyContact: emergencyContact || undefined,
        attendanceRate: 100.0,
        totalSessions: 0,
        attendedSessions: 0,
      };

      dbStore.athletes.push(newAthlete);
      added.push(newAthlete);
    }
    dbStore.saveToFile();

    return res.status(200).json({
      success: true,
      importedCount: added.length,
      errorsCount: errors.length,
      errors,
      message: `${added.length} nageurs importés avec succès depuis le fichier Excel`,
      data: added,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: `Erreur lors de l'analyse du fichier Excel : ${error.message}` });
  }
};

// Télécharger / Récupérer le modèle de fichier Excel pré-rempli
export const getExcelTemplate = (req: Request, res: Response) => {
  try {
    const headers = [
      'Prénom',
      'Nom',
      'Date de Naissance (AAAA-MM-JJ ou A.N)',
      'Genre (M/F)',
      'Groupe',
      'Catégorie',
      'Numéro de Licence FFN',
      'Contact Urgence (Téléphone)',
      'Entraîneur Référent',
    ];

    const sampleRows = [
      ['Lucas', 'Bernard', '2008-05-14', 'M', 'Groupe Élite', 'Juniors (15-18 ans)', 'FFN-845129', '06 12 34 56 78', 'Coach Élite'],
      ['Léa', 'Dubois', '2010-09-22', 'F', 'Groupe Performance', 'Cadets (16-17 ans)', 'FFN-671234', '06 98 76 54 32', 'Coach Perf'],
      ['Thomas', 'Moreau', '2014-03-10', 'M', 'Groupe Espoirs', 'Benjamins (12-13 ans)', 'FFN-982145', '07 11 22 33 44', 'Coach Espoirs'],
      ['Camille', 'Laurent', '2018-11-05', 'F', 'École de Natation', 'École de Natation (< 10 ans)', 'FFN-431876', '06 55 44 33 22', 'Coach École'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    ws['!cols'] = [
      { wch: 16 }, // Prénom
      { wch: 18 }, // Nom
      { wch: 28 }, // Date
      { wch: 14 }, // Genre
      { wch: 24 }, // Groupe
      { wch: 24 }, // Catégorie
      { wch: 24 }, // Licence
      { wch: 28 }, // Contact Urgence
      { wch: 22 }, // Entraîneur
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Modèle Nageurs ASCOS');
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    return res.json({
      success: true,
      fileName: 'modele_import_nageurs_ascos.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAthlete = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = dbStore.athletes.findIndex((a) => a.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Athlète non trouvé' });
    }

    const payload = { ...req.body };
    if (payload.dateOfBirth) {
      payload.dateOfBirth = parseExcelDate(payload.dateOfBirth, payload.category);
      if (!payload.category) {
        payload.category = determineCategory(payload.dateOfBirth);
      }
    }

    dbStore.athletes[index] = {
      ...dbStore.athletes[index],
      ...payload,
    };
    dbStore.saveToFile();

    return res.json({ success: true, data: dbStore.athletes[index] });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Recalculer et synchroniser toutes les dates de naissance des athlètes selon leur catégorie sportive
export const recalculateAllBirthDates = (req: Request, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    let fixedCount = 0;
    for (const a of dbStore.athletes) {
      const isBogus =
        !a.dateOfBirth ||
        a.dateOfBirth.startsWith('1905') ||
        a.dateOfBirth === '2010-01-01' ||
        a.dateOfBirth.length < 4;

      if (isBogus && a.category) {
        a.dateOfBirth = inferDobFromCategory(a.category, currentYear);
        fixedCount++;
      }
    }
    if (fixedCount > 0) {
      dbStore.saveToFile();
    }
    return res.json({
      success: true,
      fixedCount,
      total: dbStore.athletes.length,
      message: `${fixedCount} date(s) de naissance recalculée(s) et synchronisée(s)`,
      data: dbStore.athletes,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAthlete = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initialLength = dbStore.athletes.length;
    dbStore.athletes = dbStore.athletes.filter((a) => a.id !== id);

    if (dbStore.athletes.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Athlète non trouvé' });
    }

    // Nettoyer en cascade les présences et les temps associés
    dbStore.attendances = dbStore.attendances.filter((att) => att.athleteId !== id);
    dbStore.swimmingTimes = dbStore.swimmingTimes.filter((t) => t.athleteId !== id);
    dbStore.saveToFile();

    return res.json({ success: true, message: 'Athlète supprimé avec succès' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const clearAllAthletes = (req: Request, res: Response) => {
  try {
    const count = dbStore.athletes.length;
    dbStore.athletes = [];
    dbStore.attendances = [];
    dbStore.swimmingTimes = [];
    dbStore.saveToFile();
    return res.json({ success: true, count, message: `${count} athlètes supprimés` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

