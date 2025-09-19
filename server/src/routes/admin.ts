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

// In a real application, we would add endpoints for all other data types as well.
// For this task, I will focus on the 'saved_content' as a proof of concept.

export default router;
