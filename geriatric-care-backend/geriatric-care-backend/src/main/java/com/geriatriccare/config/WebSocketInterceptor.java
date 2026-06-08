package com.geriatriccare.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import java.security.Principal;

@Component
public class WebSocketInterceptor implements ChannelInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketInterceptor.class);

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null) {
            StompCommand command = accessor.getCommand();
            
            if (StompCommand.CONNECT.equals(command)) {
                Principal user = accessor.getUser();
                logger.info("WebSocket client connecting: sessionId={}, user={}", 
                           accessor.getSessionId(), 
                           user != null ? user.getName() : "anonymous");
                
                // In a real app, you would validate authentication here
                String authHeader = accessor.getFirstNativeHeader("Authorization");
                if (authHeader == null) {
                    logger.warn("Missing authorization header for WebSocket connection");
                } else {
                    logger.debug("Authorization header received: {}", authHeader.substring(0, Math.min(20, authHeader.length())) + "...");
                }
            } else if (StompCommand.DISCONNECT.equals(command)) {
                Principal user = accessor.getUser();
                logger.info("WebSocket client disconnecting: sessionId={}, user={}", 
                           accessor.getSessionId(), 
                           user != null ? user.getName() : "anonymous");
            } else {
                logger.debug("WebSocket message: command={}, destination={}, sessionId={}", 
                           command, 
                           accessor.getDestination(), 
                           accessor.getSessionId());
            }
        }
        
        return message;
    }
}