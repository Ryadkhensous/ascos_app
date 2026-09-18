import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbStore, UserData } from '../services/store';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'ascos_natation_secret_jwt_key_2026_super_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, assignedGroup, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires sont requis (email, mot de passe, prénom, nom)',
      });
    }

    const existingUser = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé par un autre compte',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: UserData = {
      id: `user-${Date.now()}`,
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: role === 'ADMIN' ? 'ADMIN' : 'COACH',
      assignedGroup: assignedGroup || (role === 'ADMIN' ? 'Tous les groupes' : 'Groupe Élite'),
      phone: phone || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.users.push(newUser);

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      data: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis',
      });
    }

    const user = dbStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides (email ou mot de passe incorrect)',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides (email ou mot de passe incorrect)',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      JWT_SECRET,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      data: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
  }

  const { passwordHash: _, ...safeUser } = user;
  return res.json({ success: true, data: safeUser });
};

export const getUsers = (_req: Request, res: Response) => {
  const safeUsers = dbStore.users.map(({ passwordHash, ...rest }) => rest);
  return res.json({ success: true, count: safeUsers.length, data: safeUsers });
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, assignedGroup, phone, password } = req.body;

    const userIndex = dbStore.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'Compte utilisateur introuvable' });
    }

    const user = dbStore.users[userIndex];

    // Vérifier unicité email si modifié
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailTaken = dbStore.users.some(
        (u) => u.id !== id && u.email.toLowerCase() === email.toLowerCase()
      );
      if (emailTaken) {
        return res.status(409).json({ success: false, message: 'Cet email est déjà attribué à un autre compte' });
      }
      user.email = email.toLowerCase();
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role === 'ADMIN' ? 'ADMIN' : 'COACH';
    if (assignedGroup !== undefined) user.assignedGroup = assignedGroup;
    if (phone !== undefined) user.phone = phone;

    // Si nouveau mot de passe fourni
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    user.updatedAt = new Date().toISOString();

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Compte entraîneur mis à jour avec succès',
      data: safeUser,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = dbStore.users.find((u) => u.id === id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Compte utilisateur introuvable' });
    }

    // Protection : interdire la suppression du seul admin
    if (user.role === 'ADMIN') {
      const adminCount = dbStore.users.filter((u) => u.role === 'ADMIN').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de supprimer le compte administrateur principal',
        });
      }
    }

    dbStore.users = dbStore.users.filter((u) => u.id !== id);

    return res.json({
      success: true,
      message: `Compte ${user.firstName} ${user.lastName} supprimé avec succès`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
