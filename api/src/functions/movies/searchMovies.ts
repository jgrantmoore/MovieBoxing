import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { SearchMoviesBody } from "../../models/DatabaseModels";

export async function searchMovies(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const query = request.query.get('q');
    
    let body: Partial<SearchMoviesBody> = {};
    try {
        const rawBody = await request.text();
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
        context.log("Invalid JSON body.");
    }
    
    const { StartDate, EndDate } = body;

    if (!query) {
        return { status: 400, body: "Query parameter 'q' is required" };
    }

    const headers = {
        'accept': 'application/json',
        'Authorization': process.env.TMDB_API_KEY
    };

    try {
        // 1. Search for movies matching the title
        const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`;
        const searchRes = await fetch(searchUrl, { method: 'GET', headers });
        const searchData = await searchRes.json();
        const rawResults = searchData.results || [];

        // 2. Filter by League Dates first to avoid unnecessary detail calls
        const filteredList = rawResults.filter((movie: any) => {
            if (!movie.release_date) return false;
            const releaseDate = new Date(movie.release_date);
            const afterStart = StartDate ? releaseDate >= new Date(StartDate) : true;
            const beforeEnd = EndDate ? releaseDate <= new Date(EndDate) : true;
            return afterStart && beforeEnd;
        });

        // 3. Fetch Full Details (including Budget) for filtered movies
        // We use Promise.all to run these requests in parallel
        const fullDetailResults = await Promise.all(
            filteredList.map(async (movie: any) => {
                const detailUrl = `https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`;
                const detailRes = await fetch(detailUrl, { method: 'GET', headers });
                return await detailRes.json();
            })
        );

        return { 
            status: 200, 
            jsonBody: fullDetailResults,
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        context.error("Detailed Search Failed:", error);
        return { status: 500, body: "Internal Server Error" };
    }
};

app.http('searchMovies', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'movies/search',
    handler: searchMovies
});