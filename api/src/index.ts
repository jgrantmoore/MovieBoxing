import { app } from '@azure/functions';
import './functions/leagues/createLeague';
import './functions/leagues/deleteLeague';
import './functions/leagues/getLeagueInfo';
import './functions/leagues/getMyLeagues';
import './functions/leagues/updateLeague';
import './functions/leagues/getLeague';
import './functions/leagues/searchLeagues';
import './functions/leagues/getLeagueReleaseOrder';
import './functions/leagues/getLeaderboard';

import './functions/movies/boxOfficeUpdate';
import './functions/movies/getMovieInfo';
import './functions/movies/getMovies';
import './functions/movies/searchMovies';
import './functions/movies/localMovieUpdate';

import './functions/teams/picks/pickMovie';
import './functions/teams/createTeam';
import './functions/teams/deleteTeam';
import './functions/teams/getUserTeams';
import './functions/teams/updateTeam';
import './functions/teams/getUserTeamsAndPicks';
import './functions/teams/assignMovie';
import './functions/teams/swapMovies';
import './functions/teams/replaceMovie';

import './functions/users/getUser';
import './functions/users/login';
import './functions/users/register';
import './functions/users/updateUser';
import './functions/users/getTopPerformingMovies';
import './functions/users/getUserStats';
import './functions/users/syncGoogleUser';

import './functions/warmer'

app.setup({
    enableHttpStream: true,
});
