import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import keycloak from "../auth/keycloak";

export async function createStompClient(
    roomId,
    onMessage,
    onConnect,
    onDisconnect
) {

    if (keycloak.authenticated) {
        await keycloak.updateToken(60);
    }

    const client = new Client({

        webSocketFactory: () =>
            new SockJS(`${import.meta.env.VITE_GATEWAY_URL}/chat`),

        reconnectDelay: 5000,

        connectHeaders: {
            Authorization: `Bearer ${keycloak.token}`
        },

        onConnect: () => {

            client.subscribe(
                `/topic/room/${roomId}`,
                message => onMessage(JSON.parse(message.body))
            );

            onConnect?.();
        },

        onDisconnect: () => {
            onDisconnect?.();
        },

        onStompError: frame => {
            console.error("STOMP Error:", frame);
        }

    });

    client.activate();

    return client;
}