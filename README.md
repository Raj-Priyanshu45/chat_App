# Real-Time Chat App

A real-time chat backend built with **Spring Boot**, **WebSocket/STOMP** and **MongoDB**. It has its own authentication system (cookie-based JWT with refresh-token rotation, email verification, password reset, and Google OAuth2 login), public/private rooms, direct messages, media sharing through Cloudinary, and server-enforced room membership.

---

## Features

- **Real-time messaging** over WebSocket using STOMP and Spring's in-memory Simple Broker
- **Self-built authentication**
  - Register/login with username or email, BCrypt-hashed passwords
  - Short-lived access JWT and 7-day refresh token, both in `HttpOnly` cookies
  - Refresh tokens are stored **hashed (SHA-256)** and **rotated** on every refresh
  - Email verification and forgot/reset password flows (hashed one-time tokens, 15 min expiry)
  - Google OAuth2 login with a "complete your profile" step for first-time users
- **WebSocket authentication via one-time tickets**: the client fetches a 30-second `ws` ticket over REST and passes it in the handshake URL
- **Room membership enforcement**: users can only `SUBSCRIBE`/`SEND` to rooms where they are an active member (checked in a `ChannelInterceptor`)
- **Rooms**: public (discoverable, sortable by popularity or newest), private (password protected), and DM rooms (deterministic room ID per user pair)
- **Message edit and delete** pushed live to everyone in the room
- **Media sharing** (images, video, audio) uploaded to **Cloudinary**; the Cloudinary URL is stored and broadcast as the message content
- **Reconnect catch-up** endpoint: fetch messages since a timestamp
- **User profiles**: profile picture upload, friends list, room history, batch username/avatar lookup
- **Swagger UI** for exploring the REST API

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language / Runtime | Java 21 |
| Framework | Spring Boot 4.0.7 |
| Real-time transport | Spring WebSocket + STOMP (Simple Broker) |
| Database | MongoDB 7.0 (Spring Data MongoDB) |
| Auth | Spring Security, JJWT 0.13, BCrypt, OAuth2 Client (Google) |
| Media storage | Cloudinary |
| Email | Spring Mail (Brevo SMTP relay) |
| API docs | springdoc-openapi (Swagger UI) |
| Build tool | Maven (wrapper included) |
| Misc | Lombok, Bean Validation |

---

## Prerequisites

- **JDK 21+**
- **Docker** and **Docker Compose** (for MongoDB, or for the full containerised run)
- A **Cloudinary** account (cloud name, API key, API secret)
- An **SMTP provider** for verification and reset emails (the config targets Brevo's relay)
- *(Optional)* A **Google OAuth2 client** if you want Google sign-in

---

## Configuration

All settings come from environment variables (see `src/main/resources/application.yaml`).

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | yes | none | MongoDB connection string |
| `SECRET` | **set in prod** | insecure dev key | Base64-encoded HMAC key used to sign all JWTs |
| `EXPIRATION` | no | `900000` (15 min) | Access token lifetime in ms |
| `COOKIE_SECURE` | no | `false` | Set `true` behind HTTPS |
| `FRONTEND` | no | `http://localhost:3000` | Frontend origin (CORS, WebSocket origin, redirects, email links) |
| `PORT` | no | `9000` | Server port |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for media | `not-set` | Cloudinary credentials |
| `GMAIL_USERNAME`, `GMAIL_PASSWORD` | for email | empty | SMTP credentials (Brevo) |
| `MAIL_FROM` | yes | none | "From" address on outgoing mail |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google login | `not-set` | OAuth2 client credentials |
| `OAUTH_REDIRECT_BASE` | no | `http://localhost:9000` | Base URL used for the OAuth2 redirect URI |

> The default `SECRET` is a development key checked into the repo. Always override it in any deployed environment.

Example local MongoDB URI (matches the included compose file):

```
mongodb://root:root@localhost:27017/chatAppDB?authSource=admin
```

---

## Getting Started

### 1. Clone

```bash
git clone <your-repo-url>
cd chat_app
```

### 2. Start MongoDB

```bash
docker compose up -d
```

Starts MongoDB 7.0.5 on `localhost:27017` (user `root`, password `root`, database `chatAppDB`) with a persistent volume.

### 3. Set environment variables

```bash
export MONGODB_URI="mongodb://root:root@localhost:27017/chatAppDB?authSource=admin"
export MAIL_FROM="no-reply@example.com"
export CLOUDINARY_CLOUD_NAME=...
export CLOUDINARY_API_KEY=...
export CLOUDINARY_API_SECRET=...
# plus SMTP and Google credentials if you need email / Google login
```

### 4. Run

```bash
./mvnw spring-boot:run
```

or build a jar:

```bash
./mvnw clean package
java -jar target/chat_app-0.0.1-SNAPSHOT.jar
```

The app starts on **http://localhost:9000**. Swagger UI is at `/swagger-ui`, and the OpenAPI JSON at `/api-docs`.

### Running everything in Docker

`docker-compose-docker.yml` builds the app image from the multi-stage `Dockerfile` (Maven build, then a slim JRE 21 Alpine runtime) and starts it alongside MongoDB, waiting on the Mongo healthcheck:

```bash
docker compose -f docker-compose-docker.yml up --build
```

The app container needs the same environment variables as above. Inside the compose network, MongoDB's host is `mongo_db` rather than `localhost`.

---

## How It Works

### Authentication

```
POST /auth/register          -> user created (ACTIVE, email NOT verified), verification token emailed
POST /auth/verify-email?key= -> email verified, JWT + REFRESH cookies issued
POST /auth/login             -> username or email + password (email must be verified)
GET  /auth/refresh-token     -> new access token + rotated refresh token
POST /auth/logout            -> refresh token invalidated, cookies cleared
```

- The **access token** (`JWT` cookie) carries `role`, `state` and `email_verified` claims. A servlet filter turns these into authorities (`ROLE_*`, `STATE_*`, `EMAIL_*`).
- The **refresh token** (`REFRESH` cookie, scoped to `/auth/`) is a random value. Only its SHA-256 hash is stored, so a database leak does not expose usable tokens.
- Unverified accounts get a 10-minute access token.
- Custom annotations wrap `@PreAuthorize` checks:
  - `@ActiveUser`: account is `ACTIVE` **and** email verified
  - `@PreAuth`: account is `INCOMPLETE` (OAuth users finishing their profile)
  - `@EmailVer`: email not yet verified

**Google OAuth2**

```
Google login -> OAuth2LoginHandler
   |-- new user  -> created as INCOMPLETE, short-lived token, redirect to /complete-profile
   |                 POST /auth/comp-profile {name, username} -> ACTIVE, full tokens issued
   '-- existing  -> full tokens issued, redirect to /home
```

The success handler also recognises a GitHub registration, but only Google is configured in `application.yaml`. To enable GitHub you need to add its client registration.

**Password reset**

```
POST /auth/forgot-password  -> always returns the same message (no account enumeration)
POST /auth/reset-password   -> {token, newPassword}: token is hashed in DB, expires in 15 min,
                               refresh token is revoked on success
```

### Connecting to the WebSocket

Browsers can't set custom headers on a WebSocket handshake, so the app uses short-lived tickets:

```
1. GET /api/v1/ws-ticket          (normal cookie-authenticated request)
        -> { "ticket": "<30-second JWT with type=ws>" }
2. connect to  ws://localhost:9000/chat?ticket=<ticket>
        -> HandshakeInterceptor validates signature, expiry and type=ws
        -> the user ID becomes the STOMP session Principal
```

The principal's name is the user's **ID**, not the username, and it is reused for every later frame with no re-validation.

### Membership enforcement

`StompAuthConfig` (a `ChannelInterceptor` on the inbound channel) rejects any `SUBSCRIBE` to `/topic/room/{id}` or `SEND` to `/app/sendMessages/{id}` unless the user has an active `RoomMember` record (`leftAt == null`).

Spring's broker only tracks WebSocket sessions and destinations. It knows nothing about your Mongo rooms. So business membership (Mongo) and subscription state (STOMP) are separate, and both must be kept consistent.

### Sending a room message

```
SEND /app/sendMessages/{roomId}
        -> @MessageMapping, membership checked in the interceptor
        -> chatService.sendMessage() saves to MongoDB
        -> @SendTo("/topic/room/{roomId}")
        -> broadcast to every subscriber of the room
```

### Direct messages

```
SEND /app/dm/{userId}
        -> creates (or reuses) a DM room with a deterministic ID, adds both users as members,
           updates both users' friends lists, saves the message
        -> delivered to both users via convertAndSendToUser on /user/queue/dm
```

### Edit and delete

```
SEND /app/chat/edit   { roomId, messId, updatedContent }
SEND /app/chat/del    { roomId, messId }
```

Only the original sender can edit or delete, and only text messages can be edited. Deletes are soft (`del = true`). The resulting `MESSAGE_EDITED` / `MESSAGE_DELETED` event goes to the room topic, or to each member's `/user/queue/dm` for DM rooms.

### Media sharing

1. `POST /api/v1/chat/upload/{roomId}` or `POST /api/v1/chat/dm/{userId}` with multipart field `files` (multiple files allowed)
2. The server validates MIME type, extension and size, then uploads to **Cloudinary** (folders `chat-app/image|video|audio`)
3. A `Message` is saved with the Cloudinary `secure_url` as its content and broadcast over the existing WebSocket
4. Clients render the URL directly. There is no separate download endpoint.

| Type | Allowed extensions | Max size |
|---|---|---|
| Image | jpg, jpeg, png, gif, webp, bmp | 5 MB |
| Video | mp4, webm, mov, mkv, avi, mpeg, 3gp, m4v | 20 MB |
| Audio | mp3, wav, ogg, m4a, aac, opus | 10 MB |

For a DM upload, the DM room must already exist (it is created by the first DM text message).

### Leaving a room

The backend never force-unsubscribes a client:

1. `GET /api/v1/rooms/{roomId}/leave` sets `leftAt` on the member record
2. The server notifies **only that user** on `/user/queue/room-events` with `{type: "LEFT_ROOM", roomId}`
3. The client receives it and calls `unsubscribe()` on its own STOMP subscription

Even if a client ignores the event, the interceptor blocks further `SEND`/`SUBSCRIBE` to that room, and the REST endpoints return 403.

### Reconnect flow

```
connect -> subscribe /topic/room/{id} -> GET messages (history)
   ... connection drops ...
reconnect -> get a fresh ws-ticket -> subscribe again -> GET /since?timestamp=<last seen>
```

---

## REST API Overview

Everything under `/api/v1/**` and `/update/**` requires an authenticated, active, email-verified user (`@ActiveUser`).

### Auth (`/auth`, public unless noted)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account, send verification token |
| `POST` | `/auth/verify-email?key=` | Verify email, issue tokens |
| `GET` | `/auth/send-email` | Resend verification token (authenticated) |
| `POST` | `/auth/login` | Login with username or email |
| `GET` | `/auth/refresh-token` | Rotate refresh token, issue new access token |
| `POST` | `/auth/logout` | Revoke refresh token, clear cookies |
| `POST` | `/auth/comp-profile` | Finish profile after OAuth signup (`INCOMPLETE` users) |
| `POST` | `/auth/forgot-password` | Request a reset token by email |
| `POST` | `/auth/reset-password` | Set a new password using the token |

### Rooms

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/rooms/create` | Create a public or private room |
| `POST` | `/api/v1/rooms/join` | Join a room (password required for private rooms) |
| `GET` | `/api/v1/rooms/{roomId}/messages?page=&size=` | Paginated history (members only) |
| `GET` | `/api/v1/rooms/{roomId}/since?timestamp=` | Messages after a timestamp (members only) |
| `GET` | `/api/v1/rooms/{roomId}/members` | Active member IDs (members only) |
| `GET` | `/api/v1/rooms/{roomId}/leave` | Leave a room |
| `GET` | `/api/v1/home?size=&number=&sortBy=` | Public rooms, sorted by member count (default) or `timestamp` |
| `POST` | `/api/v1/ret-rooms` | IDs of rooms the current user is in |

### Chat and media

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/chat/upload/{roomId}` | Upload media to a room |
| `POST` | `/api/v1/chat/dm/{userId}` | Upload media in a DM |
| `GET` | `/api/v1/ws-ticket` | Get a 30-second WebSocket handshake ticket |

### Users and profiles

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/me` | Current user's profile (details, avatar, friends, room history) |
| `GET` | `/api/v1/get-details/{userId}` | Another user's public profile |
| `GET` | `/api/v1/users/?page=&size=` | Paginated user list |
| `GET` | `/api/v1/users/lookup?ids=` | Batch user ID to username (max 100) |
| `GET` | `/api/v1/users/briefs?ids=` | Batch user ID to username and avatar (max 100) |
| `POST` | `/update/image` | Upload or replace profile picture |

## WebSocket (STOMP) Destinations

| Destination | Direction | Purpose |
|---|---|---|
| `/app/sendMessages/{roomId}` | Client to server | Send a room message |
| `/app/dm/{userId}` | Client to server | Send a DM |
| `/app/chat/edit` | Client to server | Edit your own text message |
| `/app/chat/del` | Client to server | Delete your own message |
| `/topic/room/{roomId}` | Server to client | Room broadcast (messages, media, edit/delete events) |
| `/user/queue/dm` | Server to client | DMs and DM-room events |
| `/user/queue/room-events` | Server to client | Per-user room events (e.g. `LEFT_ROOM`) |
| `/user/queue/errors` | Server to client | Errors raised while handling your frames |

---

## Data Model (MongoDB)

| Collection | Purpose |
|---|---|
| `app_user` | Identity: username (unique index), name, email, role, account state |
| `userAuth` | Credentials: password hash, provider (App/Google/Github), email state, hashed refresh token |
| `userExtras` | Profile extras: avatar URL, bio, friends, room history |
| `rooms` | Room metadata: room ID, scope (`Public`/`Private`/`DM`), optional password |
| `room_members` | Membership: user, room, `joinedAt`, `leftAt`, `lastReadMessageTime` |
| `messages` | Messages: room, sender, content (text or media URL), type, `del`/`edited` flags |
| `verificationTokenFlow` | One-time email-verification and password-reset tokens with expiry |

Membership is its own collection (rather than a list on the room) so that joining, leaving, rejoining and counting members are cheap indexed queries and the join/leave history is preserved.

---

## Project Structure

```
src/main/java/com/real_time/chat_app/
├── anno/            # @ActiveUser, @PreAuth, @EmailVer (composed @PreAuthorize annotations)
├── config/          # Security filter chain, CORS, WebSocket/STOMP config, STOMP interceptor, Cloudinary
├── Controllers/     # REST controllers + @MessageMapping chat controller
├── DTOs/            # Request/response records
├── enums/           # Content_Type, ScopeVar, AccountState, Provider, Role, TokenType, ...
├── exceptions/      # Global exception handler
├── jwt/             # JWT creation/parsing, cookie filter, cookie helper, OAuth2 success handler
├── Models/          # MongoDB documents
├── Repo/            # Spring Data MongoDB repositories
└── Services/        # Auth, chat, rooms, users, profiles, uploads, message edit/delete, mail
```

---

## Design Notes

- **Stateless auth, revocable sessions**: short-lived access JWTs plus hashed, rotated refresh tokens give statelessness on the hot path and real logout/revocation.
- **Realtime and bulk data are separate**: WebSocket carries small events; media goes to Cloudinary over HTTP and only its URL travels through the broker.
- **Two independent membership states**: Mongo (business rules) and the broker (subscriptions). The interceptor is the authority on who may subscribe or send; client-side unsubscribe is cleanup.
- **No account enumeration**: forgot-password always returns the same response.
- **Known limitation**: the Simple Broker is in-memory and single-node. Running multiple instances would need an external broker relay (e.g. RabbitMQ) so that all nodes share subscription state.
