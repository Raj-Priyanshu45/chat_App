import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,   // ← now reads from build-time env var
  realm: "chat-app",
  clientId: "your-client-id",
});

export default keycloak;