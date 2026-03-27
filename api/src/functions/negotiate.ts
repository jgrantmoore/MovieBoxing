import { app, HttpRequest, HttpResponseInit, InvocationContext, input } from "@azure/functions";

// This binding automatically generates the connection info for the client
const signalRNegotiate = input.generic({
    type: 'signalRConnectionInfo',
    name: 'connectionInfo',
    hubName: 'draftHub',
    connectionStringSetting: 'AzureSignalRConnectionString'
});

export async function negotiate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const connectionInfo = context.extraInputs.get(signalRNegotiate);
    return {
        body: JSON.stringify(connectionInfo),
        headers: { 'Content-Type': 'application/json' }
    };
};

app.http('negotiate', {
    methods: ['POST'],
    authLevel: 'anonymous',
    extraInputs: [signalRNegotiate],
    handler: negotiate
});