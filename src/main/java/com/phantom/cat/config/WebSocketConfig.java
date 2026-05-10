package com.phantom.cat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        // Messages broadcast to clients
        config.enableSimpleBroker("/topic");

        // Messages sent from frontend -> backend
        config.setApplicationDestinationPrefixes("/app");

        // OPTIONAL (future scaling support)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        registry
            .addEndpoint("/chat")
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}