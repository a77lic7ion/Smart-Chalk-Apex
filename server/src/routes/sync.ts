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

// Helper function to get or create user ID from email
const getUserId = async (client: any, email: string): Promise<number> => {
    // Extract email from the userId format "email|actual@email.com"
    const actualEmail = email.startsWith('email|') ? email.substring(6) : email;
    
    // Try to find existing user
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', [actualEmail]);
    
    if (userResult.rows.length > 0) {
        return userResult.rows[0].id;
    }
    
    // Create new user if not exists
    const insertResult = await client.query(
        'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id',
        [actualEmail, actualEmail.split('@')[0]]
    );
    
    return insertResult.rows[0].id;
};

// This is a helper function to perform an "upsert" in PostgreSQL.
// It will insert a new record, or update it if a record with the same ID already exists.
const upsert = async (client: any, tableName: string, data: any[], columns: string[]) => {
    if (data.length === 0) return;

    const placeholders = data.map((_, index) => 
        `(${columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');
    
    const values = data.flatMap(item => columns.map(col => {
        if (col === 'content' && item[col] !== null && item[col] !== undefined) {
            // Handle content field - ensure it's properly formatted for JSON/JSONB columns
            if (typeof item[col] === 'string') {
                // If content is a string, wrap it in a JSON object
                return JSON.stringify({ text: item[col] });
            } else if (typeof item[col] === 'object') {
                // If content is already an object, stringify it
                return JSON.stringify(item[col]);
            } else {
                // For other types, convert to string and wrap in object
                return JSON.stringify({ text: String(item[col]) });
            }
        }
        // Handle created_at field - convert timestamp to proper date format or use current timestamp
        if (col === 'created_at') {
            if (item[col]) {
                // Convert timestamp to ISO string if it's a number
                if (typeof item[col] === 'number') {
                    return new Date(item[col]).toISOString();
                }
                return item[col];
            } else {
                // Use current timestamp if created_at is null/undefined
                return new Date().toISOString();
            }
        }
        return item[col];
    }));
    
    const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        ON CONFLICT (id) DO UPDATE SET
            ${columns.map(col => `${col} = excluded.${col}`).join(', ')}
    `;
    
    await client.query(query, values);
};


router.post('/', async (req, res) => {
    const payload: SyncPayload = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Process each data type with proper user ID conversion
        for (const test of payload.savedTests) {
            if (test.userId) {
                test.user_id = await getUserId(client, test.userId);
            }
        }
        await upsert(client, 'saved_tests', payload.savedTests, ['id', 'user_id', 'name', 'content', 'created_at']);

        for (const plan of payload.lessonPlans) {
            if (plan.userId) {
                plan.user_id = await getUserId(client, plan.userId);
            }
        }
        await upsert(client, 'lesson_plans', payload.lessonPlans, ['id', 'user_id', 'name', 'content', 'created_at']);

        for (const presentation of payload.presentations) {
            if (presentation.userId) {
                presentation.user_id = await getUserId(client, presentation.userId);
            }
        }
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
        
        for (const content of savedContent) {
            if (content.userId) {
                content.user_id = await getUserId(client, content.userId);
            }
        }
        await upsert(client, 'saved_content', savedContent, ['id', 'user_id', 'name', 'type', 'content', 'created_at']);

        // Handle training_data separately with proper field mapping
        for (const record of payload.trainingData) {
            let userId = null;
            if (record.userId) {
                userId = await getUserId(client, record.userId);
            }
            
            // Map frontend fields to database fields
            const { sourceId, content, curriculum, standard, grade, subject } = record;
            
            // Handle content field - ensure it's properly formatted for JSONB
            let contentValue;
            if (typeof content === 'string') {
                // If content is already a string, wrap it in a JSON object
                contentValue = JSON.stringify({ text: content });
            } else if (typeof content === 'object' && content !== null) {
                // If content is an object, stringify it
                contentValue = JSON.stringify(content);
            } else {
                // For other types, convert to string and wrap in object
                contentValue = JSON.stringify({ text: String(content || '') });
            }
            
            await client.query(
                `INSERT INTO training_data (source_id, user_id, curriculum, standard, grade, subject, content) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (source_id) DO UPDATE SET 
                    user_id = $2, curriculum = $3, standard = $4, grade = $5, subject = $6, content = $7`,
                [sourceId, userId, curriculum, standard, grade, subject, contentValue]
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