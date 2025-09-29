import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: '*', // Allow all origins for now, should be restricted in production
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

import testsRouter from './routes/tests';
import presentationsRouter from './routes/presentations';
import lessonPlansRouter from './routes/lesson-plans';
import savedContentRouter from './routes/saved-content';
import adminRouter from './routes/admin';
import syncRouter from './routes/sync';
import imagesRouter from './routes/images';

app.get('/', (req, res) => {
  res.send('Server is running!');
});

import pool from './db';

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()'); // A simple query to check the connection
    client.release();
    res.status(200).send({ status: 'ok', message: 'Server is running and database is connected.' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).send({ status: 'error', message: 'Could not connect to the database.' });
  }
});

// API Routes
app.use('/api/tests', testsRouter);
app.use('/api/presentations', presentationsRouter);
app.use('/api/lesson-plans', lessonPlansRouter);
app.use('/api/content', savedContentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/sync', syncRouter);
app.use('/api/images', imagesRouter);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
