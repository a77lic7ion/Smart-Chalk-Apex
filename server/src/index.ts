import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import testsRouter from './routes/tests';
import presentationsRouter from './routes/presentations';
import lessonPlansRouter from './routes/lesson-plans';
import savedContentRouter from './routes/saved-content';
import adminRouter from './routes/admin';

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// API Routes
app.use('/api/tests', testsRouter);
app.use('/api/presentations', presentationsRouter);
app.use('/api/lesson-plans', lessonPlansRouter);
app.use('/api/content', savedContentRouter);
app.use('/api/admin', adminRouter);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
