package com.real_time.chat_app.config;

import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.jspecify.annotations.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthConfig implements ChannelInterceptor {

    //provided by spring
    private final JwtDecoder jwtDecoder;
    private final roomRepo roomRepo;

    //for configuring the roles from jwt to prevent it getting null
    private final JwtAuthenticationConverter jwtAuthenticationConverter;



    //override preSend method
    @Override
    public Message<?> preSend(@NonNull Message<?> message , @NonNull MessageChannel channel){

        //create the header access
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message , StompHeaderAccessor.class);


        if(accessor == null) return message;

        //check if the command is Connect
        if(StompCommand.CONNECT.equals(accessor.getCommand())){

            //extract the header

            List<String> authHeader = accessor.getNativeHeader("Authorization");

            if(authHeader == null || authHeader.isEmpty()){
                throw new JwtException("Missing authorization header");
            }

            String token = authHeader.getFirst().substring(7);

            // Jwt jwt = jwtDecoder.decode(token);

            // Authentication authentication =  jwtAuthenticationConverter.convert(jwt);

            // accessor.setUser(authentication);


            Jwt jwt = jwtDecoder.decode(token);

            log.warn("RAW JWT CLAIMS: {}", jwt.getClaims());

            Authentication authentication = jwtAuthenticationConverter.convert(jwt);

            log.warn("CONVERTED PRINCIPAL NAME: {}", authentication.getName());

            accessor.setUser(authentication);
        }

        if (StompCommand.SEND.equals(accessor.getCommand()) || StompCommand.SUBSCRIBE.equals(accessor.getCommand())){

            String destination = accessor.getDestination();
            assert destination != null;
            String roomId = extractRoomId(destination);
            String userName = Objects.requireNonNull(accessor.getUser()).getName();

            Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

            if(room == null || !room.getUsers().contains(userName)){
                throw new RuntimeException("Not a member of this room");
            }
        }

        return message;
    }

    private String extractRoomId(String message){

        StringBuilder sb = new StringBuilder();
        int count = 0;

        for(int i = 0 ; i < message.length() ; i++){
            if(count > 2) sb.append(message.charAt(i));

            if(message.charAt(i) == '/') count++;
        }

        return sb.toString();
    }
}


//
//Point-by-point on what's happening:
//
//StompHeaderAccessor — a wrapper that lets you read STOMP-specific headers/command from the generic Spring Message object. Without this, you're just looking at a raw Message<byte[]> with no easy way to know it's STOMP at all.
//        accessor.getCommand() — tells you which STOMP frame type this is (CONNECT, SEND, SUBSCRIBE, DISCONNECT). You gate your logic on CONNECT only — you don't want to re-validate the JWT on every single SEND, since that's wasteful and the identity is already attached to the session.
//        accessor.getNativeHeader("Authorization") — STOMP frames carry their own header map (nativeHeaders), separate from HTTP headers. This is what your frontend STOMP client populates when you configure connectHeaders (shown below).
//        jwtDecoder.decode(token) — this is the exact same JwtDecoder bean Spring Boot auto-configures from your issuer-uri property for the resource server. You're not writing new validation logic — you're reusing the existing signature/expiry/issuer check, just triggering it manually at a different point in the pipeline instead of automatically via a filter.
//        accessor.setUser(authentication) — this is the important part. It attaches the authenticated principal to the STOMP session, not just this one message. Every subsequent SEND/SUBSCRIBE frame on this same connection will carry this principal automatically — accessible in your @MessageMapping methods via Principal as a method parameter, without re-checking the token.
//Throwing an exception instead of returning null is deliberate — it causes Spring to send an ERROR frame back to the client and close the connection, which is what you want for a rejected connection (silently dropping via null would just hang the client with no feedback).
