import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

const ADMIN_EMAIL = 'shaunwg@outlook.com';

export const adminMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ message: 'Forbidden: Admins only' });
  }
  next();
};
