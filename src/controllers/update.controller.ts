import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

function getPaths() {
  const root = path.resolve(__dirname, '../../');
  const dataFile = path.join(root, 'data/app_version.json');
  const downloadsDir = path.join(root, 'public/downloads');
  return { root, dataFile, downloadsDir };
}

interface AppVersionMeta {
  version: string;
  buildNumber: number;
  apkFileName: string;
  releaseNotes: string;
  mandatory: boolean;
  releaseDate: string;
  minSupportedVersion?: string;
}

const defaultMeta: AppVersionMeta = {
  version: '1.0.1',
  buildNumber: 2,
  apkFileName: 'ascos.apk',
  releaseNotes: '• Filtrage des athlètes et chronos par groupe\n• Vue globale et sélective par groupe pour l\'administrateur\n• Calcul précis des dates de naissance et âges révolus\n• Système de mise à jour automatique intégrée',
  mandatory: false,
  releaseDate: '2026-10-02',
  minSupportedVersion: '1.0.0',
};

function readVersionMeta(): AppVersionMeta {
  const { dataFile } = getPaths();
  try {
    if (fs.existsSync(dataFile)) {
      const content = fs.readFileSync(dataFile, 'utf-8');
      return { ...defaultMeta, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error('Erreur lecture app_version.json:', e);
  }
  return defaultMeta;
}

function saveVersionMeta(meta: AppVersionMeta) {
  const { dataFile } = getPaths();
  fs.writeFileSync(dataFile, JSON.stringify(meta, null, 2), 'utf-8');
}

/**
 * GET /api/app/version
 * Renvoie les informations sur la dernière version disponible et l'URL de téléchargement
 */
export const getAppVersion = (req: Request, res: Response) => {
  try {
    const meta = readVersionMeta();
    const { downloadsDir } = getPaths();
    const apkPath = path.join(downloadsDir, meta.apkFileName || 'ascos.apk');
    const hasApkFile = fs.existsSync(apkPath);
    let apkSize = 0;
    if (hasApkFile) {
      try {
        const stats = fs.statSync(apkPath);
        apkSize = stats.size;
      } catch (_) {}
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const apkUrl = `${baseUrl}/downloads/${meta.apkFileName || 'ascos.apk'}`;

    return res.json({
      success: true,
      data: {
        version: meta.version,
        buildNumber: meta.buildNumber,
        apkUrl,
        downloadUrl: apkUrl,
        hasApkFile,
        apkSizeBytes: apkSize,
        releaseNotes: meta.releaseNotes,
        mandatory: meta.mandatory,
        releaseDate: meta.releaseDate,
        minSupportedVersion: meta.minSupportedVersion || '1.0.0',
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/app/version
 * Met à jour la version disponible et les notes de version (Admin)
 */
export const updateAppVersion = (req: Request, res: Response) => {
  try {
    const { version, buildNumber, releaseNotes, mandatory, apkFileName } = req.body;
    const current = readVersionMeta();

    const updated: AppVersionMeta = {
      ...current,
      version: version || current.version,
      buildNumber: buildNumber ? Number(buildNumber) : current.buildNumber,
      releaseNotes: releaseNotes !== undefined ? releaseNotes : current.releaseNotes,
      mandatory: mandatory !== undefined ? Boolean(mandatory) : current.mandatory,
      apkFileName: apkFileName || current.apkFileName,
      releaseDate: new Date().toISOString().split('T')[0],
    };

    saveVersionMeta(updated);

    return res.json({
      success: true,
      message: 'Informations de mise à jour enregistrées avec succès',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /downloads/:filename ou GET /api/app/download
 * Téléchargement direct du fichier APK
 */
export const downloadApk = (req: Request, res: Response) => {
  try {
    const meta = readVersionMeta();
    const { downloadsDir } = getPaths();
    const targetFile = req.params.filename || meta.apkFileName || 'ascos.apk';
    const filePath = path.join(downloadsDir, targetFile);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, `ascos-natation-v${meta.version}.apk`);
    }

    return res.status(404).json({
      success: false,
      message: `Fichier APK (${targetFile}) introuvable dans ${downloadsDir}. Placez votre fichier app-release.apk compilé dans ce dossier sous le nom ${targetFile}.`,
      expectedPath: filePath,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
