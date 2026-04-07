import 'dotenv/config'; // This must be the first line
import express from 'express';
import cors from 'cors';
import leagueRoutes from './routes/leagueRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import cron from 'node-cron';
import { syncMovieData } from './services/movieService.js';


const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Schedule the daily update
cron.schedule('0 8 * * *', () => {
    syncMovieData();
});

// Routes
app.use('/api/leagues', leagueRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/drafts', draftRoutes);

// Health Check (Good for Railway monitoring)
app.get('/health', (req, res) => res.send('Movie Boxing API is Live!'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});