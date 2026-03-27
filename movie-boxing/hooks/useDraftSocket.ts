import * as signalR from "@microsoft/signalr";
import { useEffect, useState } from "react";

export function useDraftSocket(leagueId: string, onNewPick: (pick: any) => void) {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

    useEffect(() => {
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${process.env.NEXT_PUBLIC_API_URL}`) // Points to your Negotiate function
            .withAutomaticReconnect()
            .build();

        newConnection.start()
            .then(() => {
                console.log("Connected to Arena Stream!");
                // Join a 'room' specific to this league
                newConnection.stream("JoinLeague", leagueId);
                
                newConnection.on("newPick", (pick) => {
                    onNewPick(pick);
                });
            })
            .catch(err => console.error("SignalR Connection Error: ", err));

        setConnection(newConnection);

        return () => {
            newConnection.stop();
        };
    }, [leagueId]);

    return connection;
}