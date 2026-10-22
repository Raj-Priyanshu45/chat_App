package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.MessageReactionRequest;
import com.real_time.chat_app.DTOs.TypingRequest;
import com.real_time.chat_app.Services.ChatRealtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class ChatRealtimeController {

    private final ChatRealtimeService chatRealtimeService;

    @MessageMapping("/chat/typing/{roomId}")
    public void typing(@DestinationVariable String roomId,
                       @Payload TypingRequest request,
                       Principal principal) {
        chatRealtimeService.publishTyping(roomId, principal.getName(), request.typing());
    }

    @MessageMapping("/chat/reaction/{roomId}")
    public void reaction(@DestinationVariable String roomId,
                         @Payload MessageReactionRequest request,
                         Principal principal) {
        chatRealtimeService.toggleReaction(roomId, principal.getName(), request.messageId(), request.emoji());
    }

    @MessageMapping("/chat/presence/{roomId}")
    public void presenceSnapshot(@DestinationVariable String roomId, @Payload Map<String, Object> ignoredPayload, Principal principal) {
        chatRealtimeService.sendPresenceSnapshot(roomId, principal.getName());
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public String handleRealtimeException(RuntimeException exception) {
        return exception.getMessage() == null ? "Realtime event failed" : exception.getMessage();
    }
}