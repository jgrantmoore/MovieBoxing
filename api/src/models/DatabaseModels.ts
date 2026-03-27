export interface Movie {
    MovieId: number;
    TMDBId: number;
    Title: string;
    Budget: number;
    BoxOffice: number;
    Status: string;
    InternationalReleaseDate: string;
    DomesticReleaseDate: string;
    PosterPath: string;
}

export interface User {
    UserId: number;
    Name: string;
    Email: string;
    PasswordHash: string;
}

export interface League {
    LeagueId: number;
    LeagueName: string;
    AdminUserId: number;
    StartDate: string;
    EndDate: string;
    StartingNumber: number;
    BenchNumber: number;
    JoinPasswordHash: string;
    PreferredReleaseDate: string;
    FreeAgentsAllowed: number;
}

export interface Team {
    TeamId: number;
    LeagueId: number;
    OwnerUserId: number;
    TeamName: string;
}

export interface CreateTeamBody {
    LeagueId: number;
    TeamName: string;
    LeaguePassword: string;
}

export interface CreateLeagueBody {
    LeagueName: string;
    StartDate: string;
    EndDate: string;
    StartingNumber: number;
    BenchNumber: number;
    JoinPassword: string;
    PreferredReleaseDate: string;
    FreeAgentsAllowed: boolean;
}

export interface PickMovieBody {
    TeamId: number;
    tmdbId: number;
}

export interface SearchMoviesBody {
    StartDate: string;
    EndDate: string;
}