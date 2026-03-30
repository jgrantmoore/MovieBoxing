import { app, InvocationContext, Timer } from "@azure/functions";

export async function warmerTrigger(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('Warmer function started. Waking up the Arena...');

    try {
        // Ping your own login or health check endpoint
        // This ensures the Node.js process and DB connection stay active
        const response = await fetch(`${process.env.NEXT_PUBLIC_LOGIN_URL || 'https://api.movieboxing.com/api/movies/info?id=1'}`, {
            method: 'GET',
        });

        context.log(`Arena Status: ${response.status} - Environment is hot.`);
    } catch (error) {
        context.error('Warmer failed to reach the API:', error);
    }
}

app.timer('warmerTrigger', {
    schedule: '0 */5 * * * *', // Runs every 5 minutes
    handler: warmerTrigger
});