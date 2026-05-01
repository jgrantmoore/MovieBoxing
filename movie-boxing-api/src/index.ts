import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import leagueRoutes from './routes/leagueRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import draftRoutes from './routes/draftRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import cron from 'node-cron';
import { syncMovieData } from './services/movieService.js';
import { snapshotEndingLeagues } from './services/leagueService.js';

const app = express();
const port = process.env.PORT || 3000;

// Create the HTTP Server
const httpServer = createServer(app);

// Initialize Socket.io
export const io = new Server(httpServer, {
    cors: {
        origin: "*", // Use your Next.js URL in production
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Socket.io Connection Logic
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.emit("test_event", "Hello from backend");

    socket.on("joinDraft", (leagueId) => {
        socket.join(`league_${leagueId}`);
        console.log(`Socket ${socket.id} joined league ${leagueId}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Routes
app.use('/api/leagues', leagueRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/contact', contactRoutes);

// Cron and Health Check

const cronOptions = {
  scheduled: true,
  timezone: "America/New_York"
};


//Runs at 11:00 PM EST every day to update movie data including box office
cron.schedule('0 3 * * *', () => syncMovieData());
//Runs at 12:05 AM EST every day to snapshot box office for leagues that ended the previous day
cron.schedule('5 4 * * *', () => snapshotEndingLeagues());
app.get('/health', (req, res) => res.send('Movie Boxing API is Live!'));

httpServer.listen(port, () => {
    console.log(`Server & Sockets running on port ${port}`);
});