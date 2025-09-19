import { Router } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all saved content for the logged in user, optionally filtered by type
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.id;
        const { type } = req.query;

        let query = 'SELECT * FROM saved_content WHERE user_id = $1';
        const params: any[] = [userId];

        if (type) {
            query += ' AND type = $2';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new saved content item
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.id;
        const { id, name, type, content } = req.body;

        if (!type) {
            return res.status(400).json({ message: 'Content type is required' });
        }

        const result = await pool.query(
            'INSERT INTO saved_content (id, user_id, name, type, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, userId, name, type, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single saved content item by id
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const result = await pool.query('SELECT * FROM saved_content WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a saved content item by id
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const result = await pool.query('DELETE FROM saved_content WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
