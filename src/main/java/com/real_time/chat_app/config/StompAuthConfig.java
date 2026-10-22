package com.real_time.chat_app.config;

import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import com.real_time.chat_app.Repo.MemberRepo;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class StompAuthConfig implements ChannelInterceptor {

    private static final String TOPIC_PREFIX = "/topic/room/";
    private static final String SEND_PREFIX = "/app/sendMessages/";
    private static final String TYPING_PREFIX = "/app/chat/typing/";
    private static final String REACTION_PREFIX = "/app/chat/reaction/";
    private static final String PRESENCE_PREFIX = "/app/chat/presence/";

    private final roomRepo roomRepo;
    private final MemberRepo memberRepo;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) return message;

        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT
                || command == StompCommand.SUBSCRIBE
                || command == StompCommand.SEND) {

            Principal user = accessor.getUser();

            if (user == null) {
                throw new MessageDeliveryException("Not authenticated");
            }

            if (command == StompCommand.SUBSCRIBE || command == StompCommand.SEND) {

                String roomId = roomIdFrom(accessor.getDestination());

                if (roomId != null
                        && !memberRepo.existsByRoomIdAndUserIdAndLeftAtIsNull(roomId, user.getName())) {
                    throw new MessageDeliveryException("Not a member of this room");
                }
            }
        }

        return message;
    }

    private String roomIdFrom(String destination) {
        if (destination == null) return null;
        for (String prefix : new String[]{TOPIC_PREFIX, SEND_PREFIX, TYPING_PREFIX, REACTION_PREFIX, PRESENCE_PREFIX}) {
            if (destination.startsWith(prefix)) return destination.substring(prefix.length());
        }
        return null;
    }
}
