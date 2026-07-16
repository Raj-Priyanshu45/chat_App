package com.real_time.chat_app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        //this is used to send message directly is user is there
        //Deliver new messages instantly to clients that are currently connected and subscribed.
        config.enableSimpleBroker("/topic");

        //it is used to store mess to db
        //it makes request to backend
        // result is used to take mess basically as the user goes to that endpoint and publish , and then it filtered

        //front end calls "/app/sendMessages/room123" this uri
        // then spring removes the prefix app by the line and that request looks like
        //@MessageMapping("/sendMessages/{roomId}")
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry){


        //when front end calls ShockJs then this frontend endpoint will be called
        //browser sends request to this uri
        registry.addEndpoint("/chat")
                .setAllowedOriginPatterns("http://localhost:[*]")
                .withSockJS();
    }
}
