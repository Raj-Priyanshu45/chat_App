package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessEditResponse;
import com.real_time.chat_app.DTOs.MessageDelResponse;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageFeatureService {

    private final MessRepo messRepo;
    private final UserRepo userRepo;
    private final SimpMessagingTemplate messagingTemplate;


    public void delMessage(String sub , String messageId, String roomId){

        Message message = messRepo.findById(messageId).orElse(null);

        if(message == null){
            log.warn("Invalid message id detected in delete message with id {}",messageId);
            throw new RuntimeException("Message Not Found");
        }

        if(message.getRoomId().equals(roomId)){
            log.warn("Invalid request for del message wrong roomId by {} from {}", sub , roomId);
            throw new RuntimeException("Message does not belong to the room");
        }

        if(!message.getSender().equals(sub)){
            log.warn("Unauthorized attempt to del message {} from user {}" , messageId , sub);
            throw new RuntimeException("Unable to delete the message");
        }

        message.setDel(true);
        messRepo.save(message);

        messagingTemplate.convertAndSend(
                "topic/room"+roomId ,
                new MessageDelResponse(
                        "Message Deleted" ,
                        roomId
                )
        );
    }


    public void editMessage(String sub , String messageId , String newMess , String roomId){
        Message message = messRepo.findById(messageId).orElse(null);

        if(message == null){
            log.warn("Invalid message id detected in edit message with id {}",messageId);
            throw new RuntimeException("Message Not Found");
        }

        if(message.getRoomId().equals(roomId)){
            log.warn("Invalid request for editing message wrong roomId by {} from {}", sub , roomId);
            throw new RuntimeException("Message does not belong to the room");
        }

        if(!message.getSender().equals(sub)){
            log.warn("Unauthorized attempt to edit message {} from user {}" , messageId , sub);
            throw new RuntimeException("Unable to edit the message");
        }

        message.setContent(newMess);
        messRepo.save(message);

        messagingTemplate.convertAndSend(
                "topic/room"+roomId ,
                    new MessEditResponse(
                            newMess ,
                            messageId ,
                            roomId
                    )
        );
    }

}
