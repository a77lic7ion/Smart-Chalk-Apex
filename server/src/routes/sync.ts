import { Router } from 'express';
import pool from '../db';

// Define SyncPayload interface locally since it's not in the shared types
interface SyncPayload {
    savedTests: any[];
    lessonPlans: any[];
    presentations: any[];
    slides: any[];
    imagePlaceholders: any[];
    savedHomework: any[];
    savedExams: any[];
    savedParsedExams: any[];
    savedManualExams: any[];
    trainingData: any[];
}

const router = Router();

// This is a helper function to perform an "upsert" in PostgreSQL.
// It will insert a new record, or update it if a record with the same ID already exists.
const upsert = async (client: any, tableName: string, data: any[], columns: string[]) => {
    if (data.length === 0) return;

    const values = data.map((item: any) => `(${columns.map(col => `'${JSON.stringify(item[col])}'`).join(', ')})`).join(', ');
    const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
            ${columns.map(col => `${col} = excluded.${col}`).join(', ')}
    `;
    await client.query(query);
};


router.post('/', async (req, res) => {
    const payload: SyncPayload = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Upsert operations for each table
        await upsert(client, 'saved_tests', payload.savedTests, ['id', 'user_id', 'name', 'content', 'created_at']);
        await upsert(client, 'lesson_plans', payload.lessonPlans, ['id', 'user_id', 'name', 'content', 'created_at']);
        await upsert(client, 'presentations', payload.presentations, ['id', 'user_id', 'name', 'created_at']);
        await upsert(client, 'slides', payload.slides, ['id', 'presentation_id', 'content']);
        await upsert(client, 'image_placeholders', payload.imagePlaceholders, ['id', 'presentation_id', 'query']);

        // Handle the generic 'saved_content' table
        const savedContent = [
            ...payload.savedHomework.map(item => ({ ...item, type: 'homework' })),
            ...payload.savedExams.map(item => ({ ...item, type: 'exam' })),
            ...payload.savedParsedExams.map(item => ({ ...item, type: 'parsed_exam' })),
            ...payload.savedManualExams.map(item => ({ ...item, type: 'manual_exam' })),
        ];
        await upsert(client, 'saved_content', savedContent, ['id', 'user_id', 'name', 'type', 'content', 'created_at']);

        // Handle training_data separately as it has an auto-incrementing ID
        for (const record of payload.trainingData) {
            // This is a simplified upsert for training_data, assuming source_id can identify uniqueness
            const { source_id, content } = record;
            await client.query(
                `INSERT INTO training_data (source_id, content) VALUES ($1, $2)
                 ON CONFLICT (source_id) DO UPDATE SET content = $2`,
                [source_id, content]
            );
        }

        await client.query('COMMIT');
        res.status(200).send({ message: 'Sync successful' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during sync:', error);
        res.status(500).send({ message: 'Sync failed', error });
    } finally {
        client.release();
    }
});

export default router;