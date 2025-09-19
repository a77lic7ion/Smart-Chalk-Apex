import { Router } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all presentations for the logged in user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.id;
        const result = await pool.query('SELECT * FROM presentations WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create a new presentation
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const userId = req.user?.id;
        const { id, name } = req.body;
        const result = await pool.query(
            'INSERT INTO presentations (id, user_id, name) VALUES ($1, $2, $3) RETURNING *',
            [id, userId, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get a single presentation by id and its slides
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const presentationResult = await pool.query('SELECT * FROM presentations WHERE id = $1 AND user_id = $2', [id, userId]);
        if (presentationResult.rows.length === 0) {
            return res.status(404).json({ message: 'Presentation not found' });
        }
        const slidesResult = await pool.query('SELECT * FROM slides WHERE presentation_id = $1', [id]);
        const presentation = presentationResult.rows[0];
        presentation.slides = slidesResult.rows;
        res.json(presentation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a presentation by id
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        // The CASCADE DELETE on the foreign key will take care of deleting associated slides
        const result = await pool.query('DELETE FROM presentations WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Presentation not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Slides Endpoints ---

// Create a new slide for a presentation
router.post('/:id/slides', authMiddleware, async(req: AuthenticatedRequest, res) => {
    try {
        const presentationId = req.params.id;
        const { id, content } = req.body;
        const result = await pool.query(
            'INSERT INTO slides (id, presentation_id, content) VALUES ($1, $2, $3) RETURNING *',
            [id, presentationId, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
