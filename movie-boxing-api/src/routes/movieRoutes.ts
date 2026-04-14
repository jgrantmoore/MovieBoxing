import { Router } from 'express';
import { 
    getMovieInfo ,
    getMovies,
    localBoxOfficeUpdate,
    searchMovies
} from '../controllers/movieController.js';

const router = Router();

// Hits /api/movies/info?id=123&tmdb=true
router.get('/info', getMovieInfo);
// Hits /api/movies
router.get('/', getMovies);
// Hits /api/movies/local-box-office-update
router.get('/local-box-office-update', localBoxOfficeUpdate);
// Post hits /api/movies/search with body { "StartDate": "2020-01-01", "EndDate": "2021-01-01" } and query ?q=Inception
router.post('/search', searchMovies);

export default router;