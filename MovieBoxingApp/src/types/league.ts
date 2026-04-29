export interface MoviePick {
    MovieId: number;
    Title: string;
    PosterUrl: string | null;
    OrderDrafted: number;
    InternationalReleaseDate: string;
    ReleaseDate: string;
    BoxOffice?: number; // Optional because not all movies have grossed yet
    IsStarting?: boolean;
}

export interface Team {
    TeamId: number;
    TeamName: string;
    LeagueId: number;
    LeagueName: string;
    StartingNumber: number;
    BenchNumber: number;
    Picks: MoviePick[];
}

export interface TopPerformer {
    Title: string;
    BoxOffice: number;
    InternationalReleaseDate: string;
    PosterUrl: string | null;
    MovieId: number;
    OrderDrafted: number;
    TeamName: string;
    LeagueName: string;
}

export interface LeagueData {
    LeagueId: number;
}

export interface LeagueTeam {
    TeamId: number;
    TeamName: string;
    OwnerUserId: number;
    Owner: string;
    DraftOrder: number;
    Picks: MoviePick[];
}

export interface LeagueData {
    LeagueId: number;
    LeagueName: string;
    StartDate: string;
    EndDate: string;
    HasDrafted: boolean;
    IsDrafting: boolean;
    isPrivate: boolean;
    AdminName: string;
    Rules: LeagueRules;
    Teams: LeagueTeam[];
    Joined: boolean;
    isAdmin: boolean;
    LeagueWinnerId: number,
    LeagueWinnerName: string
}

export interface LeagueRules {
    Starting: number;
    Bench: number;
    FreeAgents: boolean;
}