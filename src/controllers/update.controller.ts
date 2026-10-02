import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const GITHUB_RELEASE_APK_URL = 'https://github.com/Ryadkhensous/ascos_app/releases/latest/download/ascos.apk';

function getPaths() {
  const root = path.resolve(process.cwd());
  const dataFile = path.join(root, 'data/app_version.json');
  const downloadsDir = path.join(root, 'public/downloads');
  return { root, dataFile, downloadsDir };
}

export function findLocalApk(targetFile: string = 'ascos.apk'): string | null {
  const candidateDirs = [
    path.resolve(process.cwd(), 'public/downloads'),
    path.resolve(__dirname, '../../public/downloads'),
    path.resolve(__dirname, '../public/downloads'),
    path.resolve(__dirname, 'public/downloads'),
    path.join(process.cwd(), 'public/downloads'),
  ];
  for (const dir of candidateDirs) {
    const candidate = path.join(dir, targetFile);
    if (fs.existsSync(candidate)) {
      try {
        const stats = fs.statSync(candidate);
        if (stats.size > 100000) {
          return candidate;
        }
      } catch (_) {}
    }
  }
  return null;
}

interface AppVersionMeta {
  version: string;
  buildNumber: number;
  apkFileName: string;
  apkSizeBytes?: number;
  releaseNotes: string;
  mandatory: boolean;
  releaseDate: string;
  minSupportedVersion?: string;
}

const defaultMeta: AppVersionMeta = {
  version: '1.0.1',
  buildNumber: 2,
  apkFileName: 'ascos.apk',
  apkSizeBytes: 59564864,
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
    const targetFile = meta.apkFileName || 'ascos.apk';
    const localApk = findLocalApk(targetFile);
    let apkSize = meta.apkSizeBytes || 59564864;
    if (localApk) {
      try {
        const stats = fs.statSync(localApk);
        apkSize = stats.size;
      } catch (_) {}
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    const apkUrl = `${baseUrl}/downloads/${targetFile}`;

    return res.json({
      success: true,
      data: {
        version: meta.version,
        buildNumber: meta.buildNumber,
        apkUrl,
        downloadUrl: apkUrl,
        mirrorUrl: GITHUB_RELEASE_APK_URL,
        hasApkFile: true, // Toujours vrai via hébergement local ou GitHub CDN Releases
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
 * Téléchargement direct du fichier APK (local ou CDN GitHub Releases)
 */
export const downloadApk = (req: Request, res: Response) => {
  try {
    const meta = readVersionMeta();
    const targetFile = req.params.filename || meta.apkFileName || 'ascos.apk';
    const localPath = findLocalApk(targetFile);

    if (localPath) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="ascos-v${meta.version}.apk"`);
      return res.download(localPath, `ascos-v${meta.version}.apk`);
    }

    // Si non trouvé sur disque local, redirection 302 garantie vers GitHub Releases CDN
    console.log(`[APK Download] Redirection 302 vers GitHub Releases CDN pour ${targetFile}`);
    return res.redirect(302, GITHUB_RELEASE_APK_URL);
  } catch (error: any) {
    console.error('Erreur downloadApk, redirection CDN fallback:', error);
    return res.redirect(302, GITHUB_RELEASE_APK_URL);
  }
};
