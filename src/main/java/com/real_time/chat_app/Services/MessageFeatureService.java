package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessEditResponse;
import com.real_time.chat_app.DTOs.MessageDelResponse;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.Content_Type;
import com.real_time.chat_app.enums.ScopeVar;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageFeatureService {

    private final MessRepo messRepo;
    private final roomRepo roomRepo;
    private final MemberRepo memberRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public void delMessage(String sub, String messageId, String roomId) {

        Message message = loadOwnedMessage(sub, messageId, roomId, "delete");

        message.setDel(true);
        messRepo.save(message);

        publish(roomId, new MessageDelResponse("MESSAGE_DELETED", messageId, roomId));
    }

    public void editMessage(String sub, String messageId, String newMess, String roomId) {

        if (newMess == null || newMess.isBlank()) {
            throw new RuntimeException("Message cannot be empty");
        }

        Message message = loadOwnedMessage(sub, messageId, roomId, "edit");

        if (message.getType() != null && message.getType() != Content_Type.TEXT) {
            throw new RuntimeException("Only text messages can be edited");
        }

        message.setContent(newMess.trim());
        message.setEdited(true);
        messRepo.save(message);

        publish(roomId, new MessEditResponse(
                "MESSAGE_EDITED",
                messageId,
                message.getContent(),
                roomId
        ));
    }

    private Message loadOwnedMessage(String sub, String messageId, String roomId, String action) {

        if (messageId == null || roomId == null) {
            throw new RuntimeException("Invalid request");
        }

        Message message = messRepo.findById(messageId).orElse(null);

        if (message == null || message.isDel()) {
            log.warn("Invalid message id detected in {} message with id {}", action, messageId);
            throw new RuntimeException("Message Not Found");
        }

        if (!roomId.equals(message.getRoomId())) {
            log.warn("Invalid request to {} message, wrong roomId by {} from {}", action, sub, roomId);
            throw new RuntimeException("Message does not belong to the room");
        }

        if (!sub.equals(message.getSender())) {
            log.warn("Unauthorized attempt to {} message {} from user {}", action, messageId, sub);
            throw new RuntimeException("Unable to " + action + " the message");
        }

        return message;
    }

    private void publish(String roomId, Object event) {

        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

        if (room != null && room.getScopeVar() == ScopeVar.DM) {
            memberRepo.findByRoomIdAndLeftAtIsNull(roomId).forEach(member ->
                    messagingTemplate.convertAndSendToUser(member.getUserId(), "/queue/dm", event)
            );
            return;
        }

        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
    }
}