import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { dbStore, AthleteData } from '../services/store';

// Fonction utilitaire pour normaliser les dates d'Excel
function parseExcelDate(val: any): string {
  if (!val) return '2010-01-01';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Nombre de jours depuis le 1er janvier 1900 (format série Excel)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  // Formats DD/MM/YYYY ou DD-MM-YYYY
  const frMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (frMatch) {
    const day = frMatch[1].padStart(2, '0');
    const month = frMatch[2].padStart(2, '0');
    const year = frMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

// Déterminer la catégorie d'âge sportive selon l'année de naissance
function determineCategory(dob: string): string {
  try {
    const birthYear = parseInt(dob.split('-')[0], 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age <= 10) return 'Avenirs (< 11 ans)';
    if (age <= 14) return 'Jeunes (11-14 ans)';
    if (age <= 18) return 'Juniors (15-18 ans)';
    return 'Séniors & Maîtres (19+ ans)';
  } catch (_) {
    return 'Juniors (15-18 ans)';
  }
}

export const getAthletes = (req: Request, res: Response) => {
  try {
    const { group, category, search, coachGroup, coachGroups, coachId } = req.query;
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

// Importation directe depuis un fichier Excel (.xlsx, .xls) ou CSV en Base64
export const importExcelAthletes = (req: Request, res: Response) => {
  try {
    const { fileBase64, defaultGroup } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ success: false, message: 'Données de fichier base64 requises' });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

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

      // Détection des clés insensibles à la casse et aux accents
      let firstName = '';
      let lastName = '';
      let rawDob: any = null;
      let rawGender = '';
      let groupName = defaultGroup || 'Groupe Performance';
      let category = '';
      let licenseNumber = '';
      let emergencyContact = '';
      let coachName = '';

      for (const key of Object.keys(row)) {
        const cleanKey = key
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''); // enlever les accents

        const val = String(row[key]).trim();

        if (cleanKey.includes('prenom') || cleanKey === 'firstname' || cleanKey === 'first name') {
          firstName = val;
        } else if (cleanKey === 'nom' || cleanKey === 'lastname' || cleanKey === 'last name' || cleanKey === 'famille') {
          lastName = val;
        } else if (cleanKey.includes('naissance') || cleanKey === 'dob' || cleanKey === 'date' || cleanKey === 'birth') {
          rawDob = row[key];
        } else if (cleanKey.includes('genre') || cleanKey.includes('sexe') || cleanKey === 'gender') {
          rawGender = val;
        } else if (cleanKey.includes('groupe') || cleanKey === 'group') {
          if (val) groupName = val;
        } else if (cleanKey.includes('categorie') || cleanKey === 'category') {
          category = val;
        } else if (cleanKey.includes('licence') || cleanKey.includes('license') || cleanKey === 'ffn') {
          licenseNumber = val;
        } else if (cleanKey.includes('urgence') || cleanKey.includes('contact') || cleanKey.includes('telephone') || cleanKey.includes('tel') || cleanKey === 'phone') {
          emergencyContact = val;
        } else if (cleanKey.includes('entraineur') || cleanKey.includes('coach')) {
          coachName = val;
        }
      }

      if (!firstName || !lastName) {
        errors.push(`Ligne ${rowNum} ignorée : prénom ou nom manquant.`);
        continue;
      }

      const dob = parseExcelDate(rawDob);
      let gender: 'MALE' | 'FEMALE' = 'MALE';
      const gLower = rawGender.toLowerCase();
      if (gLower.startsWith('f') || gLower === 'femme' || gLower === 'fille' || gLower === 'féminin') {
        gender = 'FEMALE';
      }

      // Associer l'entraîneur correspondant au groupe si coachName n'est pas spécifié
      if (!coachName) {
        const matchingCoach = dbStore.users.find(
          (u) => u.role === 'COACH' && u.assignedGroup && u.assignedGroup.toLowerCase() === groupName.toLowerCase()
        );
        if (matchingCoach) {
          coachName = `${matchingCoach.firstName} ${matchingCoach.lastName}`;
        }
      }

      const newAthlete: AthleteData = {
        id: `ath-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        firstName,
        lastName,
        dateOfBirth: dob,
        gender,
        category: category || determineCategory(dob),
        groupName,
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
      'Date de Naissance (AAAA-MM-JJ)',
      'Genre (M/F)',
      'Groupe',
      'Catégorie',
      'Numéro de Licence FFN',
      'Contact Urgence (Téléphone)',
      'Entraîneur Référent',
    ];

    const sampleRows = [
      ['Lucas', 'Bernard', '2008-05-14', 'M', 'Groupe Élite', 'Juniors (15-18 ans)', 'FFN-845129', '06 12 34 56 78', 'Coach Élite'],
      ['Léa', 'Dubois', '2010-09-22', 'F', 'Groupe Performance', 'Jeunes (11-14 ans)', 'FFN-671234', '06 98 76 54 32', 'Coach Perf'],
      ['Thomas', 'Moreau', '2012-03-10', 'M', 'Groupe Espoirs', 'Jeunes (11-14 ans)', 'FFN-982145', '07 11 22 33 44', 'Coach Espoirs'],
      ['Camille', 'Laurent', '2014-11-05', 'F', 'École de Natation', 'Avenirs (< 11 ans)', 'FFN-431876', '06 55 44 33 22', 'Coach École'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    // Définir des largeurs de colonnes confortables
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

    dbStore.athletes[index] = {
      ...dbStore.athletes[index],
      ...req.body,
    };
    dbStore.saveToFile();

    return res.json({ success: true, data: dbStore.athletes[index] });
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

