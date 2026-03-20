import { app } from '@azure/functions';
import './functions/leagues/createLeague';
import './functions/leagues/deleteLeague';
import './functions/leagues/getLeagueInfo';
import './functions/leagues/getMyLeagues';
import './functions/leagues/updateLeague';

import './functions/movies/boxOfficeUpdate';
import './functions/movies/getMovieInfo';
import './functions/movies/getMovies';

import './functions/teams/picks/pickMovie';
import './functions/teams/createTeam';
import './functions/teams/deleteTeam';
import './functions/teams/getUserTeams';
import './functions/teams/updateTeam';
import './functions/teams/getUserTeamsAndPicks';

import './functions/users/getUser';
import './functions/users/login';
import './functions/users/register';
import './functions/users/updateUser';

app.setup({
    enableHttpStream: true,
});
