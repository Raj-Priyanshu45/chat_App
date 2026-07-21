package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Services.chatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestBody;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class chatController {

    private final chatService chatService;


    //@MessageMapping -> it is like post mapping of WebSocket
                        //it is used to take the messages

    //@Sendto -> it is used to redirect message to specific location
                //sending message


    @PreAuthorize("hasRole('USER')")
    @MessageMapping("/sendMessages/{roomId}")
    //for sending and receiving message
    @SendTo("/topic/room/{roomId}")
    //for subscribe to channel
    //used to publish message to all the topic or groups
    public Message sendMessage(
            @DestinationVariable String roomId ,
            @RequestBody MessageRequest request ,
            Principal principal
    ){

        return chatService.sendMessage(request , roomId , principal.getName());
    }
}
