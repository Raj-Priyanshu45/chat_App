# Real-Time Chat App

A real-time chat application built with **Spring Boot**, **WebSocket/STOMP**, **MongoDB**, and **Keycloak** (OAuth2/JWT) for authentication. Supports public/private rooms, direct messages, file/image/video/audio sharing, and room membership management — all delivered live over a single WebSocket connection.

---

## Features

- **Real-time messaging** over WebSocket using the STOMP protocol and Spring's Simple in-memory broker
- **Room-based chat** — create public or password-protected private rooms
- **Direct messages (DMs)** between two users, with an auto-generated deterministic room ID
- **File sharing** — images, videos, and audio in both rooms and DMs (uploaded via REST, broadcast as metadata over WebSocket, fetched on demand)
- **JWT authentication** via Keycloak, validated both on REST endpoints (Spring Security OAuth2 Resource Server) and on the WebSocket `CONNECT` handshake (custom `ChannelInterceptor`)
- **Room membership enforcement** — users can only `SUBSCRIBE`/`SEND` to rooms they've joined
- **Paginated message history** and "messages since timestamp" endpoint for reconnect/catch-up
- **User profile** endpoint that provisions a user record on first login (JIT provisioning from JWT claims)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language / Runtime | Java 21 |
| Framework | Spring Boot 4.0.7 |
| Real-time transport | Spring WebSocket + STOMP (Simple Broker) |
| Database | MongoDB 7.0 |
| Auth | Keycloak (OAuth2 Resource Server, JWT) |
| Build tool | Maven (via included wrapper `mvnw`) |
| Misc | Lombok, Bean Validation (`jakarta.validation`) |

---

## Prerequisites

Before running the app, make sure you have:

- **JDK 21+**
- **Docker** & **Docker Compose** (for MongoDB)
- A running **Keycloak** instance with:
  - A realm named `chat-app` (or update `issuer-uri` to match yours)
  - A client configured for this app
  - Users with a `USER` role (checked via `realm_access.roles` in the JWT)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd chat_app
```

### 2. Start MongoDB

A `docker-compose.yml` is included:

```bash
docker compose up -d
```

This starts MongoDB on `localhost:27017` with:
- **User:** `root`
- **Password:** `root`
- **Database:** `chatAppDB`

### 3. Set up Keycloak

Run Keycloak (locally or via Docker) so it's reachable at `http://localhost:8181`, then create:
- Realm: `chat-app`
- A client for the frontend/backend to use
- At least one user with the `USER` realm role

The app expects the issuer and JWK set at:
```
http://localhost:8181/realms/chat-app
http://localhost:8181/realms/chat-app/protocol/openid-connect/certs
```

If your Keycloak runs elsewhere, update `src/main/resources/application.yaml` accordingly.

### 4. Configure file storage path

Uploaded media (images/video/audio) is currently written to a hardcoded path:
```
/home/devxraj/Java/ChatAppStorage
```
Update this path in `ImageVideoService.java` and `DmFileUploadService.java` (and the retrieval path in `chatController.java`) to match your machine before running.

### 5. Run the application

Using the Maven wrapper:

```bash
./mvnw spring-boot:run
```

Or build a jar and run it:

```bash
./mvnw clean package
java -jar target/chat_app-0.0.1-SNAPSHOT.jar
```

The app starts on **port 9000** by default (`server.port` in `application.yaml`).

---

## How It Works

### Connecting

The frontend connects to the STOMP endpoint:
```
ws://localhost:9000/chat
```
On `CONNECT`, the client must send an `Authorization: Bearer <jwt>` STOMP header. A custom `ChannelInterceptor` (`StompAuthConfig`) validates the token once at connection time and attaches the authenticated principal to the session — no re-validation needed on every subsequent frame.

### Sending a room message

```
Client sends STOMP frame
  SEND /app/sendMessages/{roomId}
        ↓
@MessageMapping("/sendMessages/{roomId}")
        ↓
chatService.sendMessage() → saved to MongoDB
        ↓
@SendTo("/topic/room/{roomId}")
        ↓
Broadcast to everyone subscribed to /topic/room/{roomId}
```

### Direct messages

```
SEND /app/dm/{username}
        ↓
chatService.sendDm() → creates/reuses a deterministic DM room, saves message
        ↓
convertAndSendToUser() to both participants on /queue/dm
```

### File / media sharing

Files are **not** sent over WebSocket. The flow is:
1. `POST /api/v1/chat/upload/{roomId}` (or `/api/v1/chat/dm/{rec}`) — multipart upload, saved to disk, `Message` document saved to Mongo
2. The saved `Message` (metadata only — filename, sender, type, timestamp) is broadcast via `convertAndSend`/`convertAndSendToUser` over the existing WebSocket connection
3. Each client fetches the actual bytes on demand via `GET /api/v1/chat/ret/{filename}`

This mirrors how production chat apps (Slack, Discord, etc.) separate the realtime event channel from bulk media delivery.

### Leaving a room

The backend never force-unsubscribes a client. Instead:
1. `GET /api/v1/rooms/{roomId}/leave` removes the user from the room's membership in Mongo
2. The server notifies **only that user** via `convertAndSendToUser(..., "/queue/room-events", ...)`
3. The frontend, on receiving the `LEFT_ROOM` event, calls `unsubscribe()` on its own STOMP subscription

---

## REST API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/rooms/create` | Create a public or private room |
| `POST` | `/api/v1/rooms/join` | Join a room (validates password for private rooms) |
| `GET` | `/api/v1/rooms/{roomId}/messages` | Paginated message history |
| `GET` | `/api/v1/rooms/{roomId}/since?timestamp=` | Messages since a given timestamp (reconnect sync) |
| `GET` | `/api/v1/rooms/{roomId}/leave` | Leave a room |
| `GET` | `/api/v1/rooms/{roomId}/members` | List current room members |
| `POST` | `/api/v1/chat/upload/{roomId}` | Upload image/video/audio to a room |
| `POST` | `/api/v1/chat/dm/{rec}` | Upload image/video/audio in a DM |
| `GET` | `/api/v1/chat/ret/{filename}` | Fetch uploaded media bytes |
| `GET` | `/api/v1/users/` | Paginated list of users |
| `GET` | `/api/v1/me` | Get (or provision) the current user's profile |
| `GET` | `/api/v1/home` | Paginated, sortable list of public rooms |

## WebSocket (STOMP) Destinations

| Destination | Direction | Purpose |
|---|---|---|
| `/app/sendMessages/{roomId}` | Client → Server | Send a room message |
| `/topic/room/{roomId}` | Server → Client | Room broadcast (messages + media events) |
| `/app/dm/{username}` | Client → Server | Send a DM |
| `/user/queue/dm` | Server → Client | Receive a DM |
| `/user/queue/room-events` | Server → Client | Room events (e.g. `LEFT_ROOM`) |
| `/user/queue/errors` | Server → Client | Errors raised during message handling |

---

## Project Structure

```
src/main/java/com/real_time/chat_app/
├── config/          # WebSocket, Security, Keycloak JWT, STOMP auth interceptor
├── Controllers/      # REST + @MessageMapping controllers
├── DTOs/             # Request/response records
├── enums/             # Content_Type, ScopeVar
├── exceptions/        # Exception handling
├── Models/            # MongoDB documents (Message, Rooms, Users, UserExtras)
├── Repo/               # Spring Data MongoDB repositories
└── Services/            # Business logic (chat, rooms, users, file upload, profile)
```
