import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';

const router = Router();

// Get all saved content from all users
router.get('/content', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    // The adminMiddleware has already verified that req.user exists and is an admin.
    const result = await pool.query('SELECT sc.*, u.email as user_email FROM saved_content sc JOIN users u ON sc.user_id = u.id ORDER BY sc.created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/db-test', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({ message: 'Database connection successful' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

export default router;
