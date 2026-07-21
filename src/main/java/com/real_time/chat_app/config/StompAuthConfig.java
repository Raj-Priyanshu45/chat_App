package com.real_time.chat_app.config;

import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class StompAuthConfig implements ChannelInterceptor {

    //provided by spring
    private final JwtDecoder jwtDecoder;


    //override preSend method
    @Override
    public Message<?> preSend(@NonNull Message<?> message , @NonNull MessageChannel channel){

        //create the header access
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message , StompHeaderAccessor.class);


        //check if the command is Connect
        if(accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())){

            //extract the header

            List<String> authHeader = accessor.getNativeHeader("Authorization");

            if(authHeader == null || authHeader.isEmpty()){
                throw new JwtException("Missing authorization header");
            }

            String token = authHeader.getFirst().substring(7);

            Jwt jwt = jwtDecoder.decode(token);

            Authentication authenticaton =
                    new UsernamePasswordAuthenticationToken(
                            jwt.getSubject() ,
                            null ,
                            List.of()
                    );

            accessor.setUser(authenticaton);
        }

        return message;
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
