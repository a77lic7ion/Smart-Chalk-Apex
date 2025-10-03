import { Router } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

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

const ADMIN_EMAIL = 'Admin@smartchalk.co.za';

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


router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
    const payload: SyncPayload = req.body;
    const authenticatedUserId = req.user!.id;
    const authenticatedUserEmail = req.user!.email;

    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
        return res.status(400).send({ message: 'Invalid payload structure' });
    }
    
    // Ensure all required arrays exist, even if empty
    const safePayload = {
        savedTests: payload.savedTests || [],
        lessonPlans: payload.lessonPlans || [],
        presentations: payload.presentations || [],
        slides: payload.slides || [],
        imagePlaceholders: payload.imagePlaceholders || [],
        savedHomework: payload.savedHomework || [],
        savedExams: payload.savedExams || [],
        savedParsedExams: payload.savedParsedExams || [],
        savedManualExams: payload.savedManualExams || [],
        trainingData: payload.trainingData || []
    };
    
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const is_admin = authenticatedUserEmail === ADMIN_EMAIL;

        // Process each data type with proper user ID conversion
        for (const test of safePayload.savedTests) {
            if (is_admin && test.userId) {
                test.user_id = await getUserId(client, test.userId);
            } else {
                test.user_id = authenticatedUserId;
            }
        }
        await upsert(client, 'saved_tests', safePayload.savedTests, ['id', 'user_id', 'name', 'content', 'created_at']);

        for (const plan of safePayload.lessonPlans) {
            if (is_admin && plan.userId) {
                plan.user_id = await getUserId(client, plan.userId);
            } else {
                plan.user_id = authenticatedUserId;
            }
        }
        await upsert(client, 'lesson_plans', safePayload.lessonPlans, ['id', 'user_id', 'name', 'content', 'created_at']);

        for (const presentation of safePayload.presentations) {
            if (is_admin && presentation.userId) {
                presentation.user_id = await getUserId(client, presentation.userId);
            } else {
                presentation.user_id = authenticatedUserId;
            }
        }
        await upsert(client, 'presentations', safePayload.presentations, ['id', 'user_id', 'name', 'created_at']);

        await upsert(client, 'slides', safePayload.slides, ['id', 'presentation_id', 'content']);
        await upsert(client, 'image_placeholders', safePayload.imagePlaceholders, ['id', 'presentation_id', 'query']);

        // Handle the generic 'saved_content' table
        const savedContent = [
            ...safePayload.savedHomework.map(item => ({ ...item, type: 'homework' })),
            ...safePayload.savedExams.map(item => ({ ...item, type: 'exam' })),
            ...safePayload.savedParsedExams.map(item => ({ ...item, type: 'parsed_exam' })),
            ...safePayload.savedManualExams.map(item => ({ ...item, type: 'manual_exam' })),
        ];
        
        for (const content of savedContent) {
            if (is_admin && content.userId) {
                content.user_id = await getUserId(client, content.userId);
            } else {
                content.user_id = authenticatedUserId;
            }
        }
        await upsert(client, 'saved_content', savedContent, ['id', 'user_id', 'name', 'type', 'content', 'created_at']);

        // Handle training_data with proper field mapping for the actual table structure
        for (const record of safePayload.trainingData) {
            if (is_admin && record.userId) {
                record.user_id = await getUserId(client, record.userId);
            } else {
                record.user_id = authenticatedUserId;
            }
        }
        await upsert(client, 'training_data', safePayload.trainingData, ['id', 'source_id', 'user_id', 'curriculum', 'standard', 'grade', 'subject', 'content', 'created_at']);

        await client.query('COMMIT');
        res.status(200).send({ message: 'Sync successful' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Sync error:', error);
        
        // Type guard for error handling
        const errorObj = error as any;
        console.error('Error message:', errorObj?.message);
        console.error('Error stack:', errorObj?.stack);
        
        res.status(500).json({
            message: 'Sync failed',
            error: {
                message: errorObj?.message || 'Unknown error',
                stack: errorObj?.stack || 'No stack trace',
                details: errorObj?.detail || errorObj?.hint || 'No additional details'
            }
        });
    } finally {
        client.release();
    }
});

export default router;