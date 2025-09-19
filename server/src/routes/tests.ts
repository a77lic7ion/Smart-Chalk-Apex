import { Router } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all tests for the logged in user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const result = await pool.query('SELECT * FROM saved_tests WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new test
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { id, name, content } = req.body;
    const result = await pool.query(
      'INSERT INTO saved_tests (id, user_id, name, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, name, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single test by id
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const result = await pool.query('SELECT * FROM saved_tests WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Test not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a test by id
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const result = await pool.query('DELETE FROM saved_tests WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Test not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
