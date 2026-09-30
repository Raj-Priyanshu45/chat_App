package com.real_time.chat_app.config;

import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Configuration
@RequiredArgsConstructor
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthConfig channelInterceptor;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        registry.addEndpoint("/chat")
                .setAllowedOrigins(frontendUrl)
                .addInterceptors(new HandshakeInterceptor() {

                    // Runs on the HTTP upgrade request. The JWT cookie was already
                    // checked by Filter, so request.getPrincipal() is the logged-in user.
                    @Override
                    public boolean beforeHandshake(@NonNull ServerHttpRequest request,
                                                   @NonNull ServerHttpResponse response,
                                                   @NonNull WebSocketHandler wsHandler,
                                                   @NonNull Map<String, Object> attributes) {

                        if (request.getPrincipal() == null) {
                            response.setStatusCode(HttpStatus.UNAUTHORIZED);
                            return false;
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(@NonNull ServerHttpRequest request,
                                               @NonNull ServerHttpResponse response,
                                               @NonNull WebSocketHandler wsHandler,
                                               Exception exception) {
                    }
                });
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(channelInterceptor);
    }
}