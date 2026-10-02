package com.real_time.chat_app.config;

import com.real_time.chat_app.jwt.JwtCreation;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.security.Principal;
import java.util.Map;

@Configuration
@RequiredArgsConstructor
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthConfig channelInterceptor;
    private final JwtCreation jwtCreation;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/chat")
                .setAllowedOrigins(frontendUrl)
                .setHandshakeHandler(new DefaultHandshakeHandler() {
                    @Override
                    protected Principal determineUser(ServerHttpRequest request,
                                                      WebSocketHandler wsHandler,
                                                      Map<String, Object> attributes) {
                        String userId = (String) attributes.get("userId");
                        return userId == null ? null : () -> userId;
                    }
                })
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(@NonNull ServerHttpRequest request,
                                                   @NonNull ServerHttpResponse response,
                                                   @NonNull WebSocketHandler wsHandler,
                                                   @NonNull Map<String, Object> attributes) {
                        String ticket = UriComponentsBuilder.fromUri(request.getURI())
                                .build().getQueryParams().getFirst("ticket");
                        try {
                            Claims claims = jwtCreation.parse(ticket);
                            if (!"ws".equals(claims.get("type", String.class))) {
                                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                                return false;
                            }
                            attributes.put("userId", claims.getSubject());
                            return true;
                        } catch (Exception e) {
                            response.setStatusCode(HttpStatus.UNAUTHORIZED);
                            return false;
                        }
                    }

                    @Override
                    public void afterHandshake(@NonNull ServerHttpRequest request,
                                               @NonNull ServerHttpResponse response,
                                               @NonNull WebSocketHandler wsHandler,
                                               Exception exception) {}
                });
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(channelInterceptor);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        scheduler.initialize();

        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(scheduler);

        config.setApplicationDestinationPrefixes("/app");
    }
}