package com.real_time.chat_app.Services;

import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.ScopeVar;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ChatRealtimeService {

    private static final Set<String> ALLOWED_REACTIONS = Set.of("👍", "❤️", "😂", "🎉", "😮", "👀");
    private static final Pattern VALID_EMOJI = Pattern.compile("^[\\p{So}\\p{Sk}\\uFE0F\\u200D]+$");

    private final SimpMessagingTemplate messagingTemplate;
    private final MemberRepo memberRepo;
    private final MessRepo messRepo;
    private final roomRepo roomRepo;

    // Per-instance presence state; suitable for the project's current in-memory STOMP broker.
    private final ConcurrentMap<String, Set<String>> sessionsByUser = new ConcurrentHashMap<>();

    public void publishTyping(String roomId, String userId, boolean typing) {
        requireActiveMember(roomId, userId);
        Map<String, Object> event = Map.of(
                "type", "TYPING",
                "roomId", roomId,
                "userId", userId,
                "typing", typing,
                "timestamp", System.currentTimeMillis()
        );
        publishToRoomMembers(roomId, event, userId, false);
    }

    public void toggleReaction(String roomId, String userId, String messageId, String emoji) {
        requireActiveMember(roomId, userId);
        if (messageId == null || messageId.isBlank()) throw new IllegalArgumentException("Message ID is required");
        if (emoji == null || !ALLOWED_REACTIONS.contains(emoji) || !VALID_EMOJI.matcher(emoji).matches()) {
            throw new IllegalArgumentException("Unsupported reaction");
        }

        Message message = messRepo.findById(messageId).orElseThrow(() -> new IllegalArgumentException("Message not found"));
        if (!roomId.equals(message.getRoomId()) || message.isDel()) {
            throw new IllegalArgumentException("Message does not belong to this conversation");
        }

        Map<String, Set<String>> reactions = new HashMap<>();
        if (message.getReactions() != null) {
            message.getReactions().forEach((key, users) -> reactions.put(key, users == null ? new HashSet<>() : new HashSet<>(users)));
        }

        Set<String> users = reactions.computeIfAbsent(emoji, ignored -> new HashSet<>());
        if (!users.add(userId)) users.remove(userId);
        if (users.isEmpty()) reactions.remove(emoji);

        message.setReactions(reactions);
        Message saved = messRepo.save(message);

        Map<String, Set<String>> eventReactions = new HashMap<>();
        if (saved.getReactions() != null) {
            saved.getReactions().forEach((key, value) -> eventReactions.put(key, value == null ? Set.of() : Set.copyOf(value)));
        }
        Map<String, Object> event = new HashMap<>();
        event.put("type", "MESSAGE_REACTION_UPDATED");
        event.put("roomId", roomId);
        event.put("messageId", messageId);
        event.put("reactions", eventReactions);
        event.put("timestamp", System.currentTimeMillis());
        publishToRoomMembers(roomId, event, userId, true);
    }

    public void sendPresenceSnapshot(String roomId, String userId) {
        requireActiveMember(roomId, userId);
        List<String> onlineUserIds = memberRepo.findByRoomIdAndLeftAtIsNull(roomId).stream()
                .map(RoomMember::getUserId)
                .filter(id -> sessionsByUser.containsKey(id) && !sessionsByUser.get(id).isEmpty())
                .distinct()
                .toList();
        Map<String, Object> snapshot = Map.of(
                "type", "PRESENCE_SNAPSHOT",
                "roomId", roomId,
                "onlineUserIds", onlineUserIds,
                "timestamp", System.currentTimeMillis()
        );
        messagingTemplate.convertAndSendToUser(userId, "/queue/presence", snapshot);
    }

    @EventListener
    public void onSessionConnected(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();
        if (principal == null || sessionId == null) return;

        String userId = principal.getName();
        AtomicBoolean becameOnline = new AtomicBoolean(false);
        sessionsByUser.compute(userId, (id, sessions) -> {
            Set<String> next = sessions == null ? ConcurrentHashMap.newKeySet() : sessions;
            boolean wasEmpty = next.isEmpty();
            next.add(sessionId);
            becameOnline.set(wasEmpty);
            return next;
        });
        if (becameOnline.get()) publishPresenceForUser(userId, true);
    }

    @EventListener
    public void onSessionDisconnected(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        String sessionId = accessor.getSessionId();
        if (principal == null || sessionId == null) return;

        AtomicBoolean becameOffline = new AtomicBoolean(false);
        sessionsByUser.computeIfPresent(principal.getName(), (id, sessions) -> {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) {
                becameOffline.set(true);
                return null;
            }
            return sessions;
        });
        if (becameOffline.get()) publishPresenceForUser(principal.getName(), false);
    }

    private void publishPresenceForUser(String userId, boolean online) {
        Set<String> roomIds = new HashSet<>();
        memberRepo.findByUserIdAndLeftAtIsNull(userId).forEach(member -> roomIds.add(member.getRoomId()));
        for (String roomId : roomIds) {
            Map<String, Object> event = Map.of(
                    "type", "PRESENCE",
                    "roomId", roomId,
                    "userId", userId,
                    "online", online,
                    "timestamp", System.currentTimeMillis()
            );
            publishToRoomMembers(roomId, event, userId, false);
        }
    }

    private void publishToRoomMembers(String roomId, Object event, String actorId, boolean includeActor) {
        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);
        if (room != null && room.getScopeVar() == ScopeVar.DM) {
            for (RoomMember member : memberRepo.findByRoomIdAndLeftAtIsNull(roomId)) {
                if (!includeActor && member.getUserId().equals(actorId)) continue;
                messagingTemplate.convertAndSendToUser(member.getUserId(), "/queue/dm", event);
            }
            return;
        }
        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
    }

    private void requireActiveMember(String roomId, String userId) {
        if (roomId == null || roomId.isBlank() || userId == null
                || !memberRepo.existsByRoomIdAndUserIdAndLeftAtIsNull(roomId, userId)) {
            throw new IllegalArgumentException("Not a member of this conversation");
        }
    }
}