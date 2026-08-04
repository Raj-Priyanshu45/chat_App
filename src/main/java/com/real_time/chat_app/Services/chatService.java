package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.Content_Type;
import com.real_time.chat_app.enums.ScopeVar;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class chatService {

    private final roomRepo roomRepo;
    private final UserRepo userRepo;
    private final MessRepo messRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public Message sendMessage(MessageRequest request, String roomId, String username) {

        Boolean roomFlag = roomRepo.existsByRoomId(roomId);
        boolean userFlag = userRepo.existsByUsername(username);

        if (!roomFlag) {
            throw new RuntimeException("Room Not Found");
        }

        if (!userFlag) {
            throw new RuntimeException("UnAuthorized Attempt");
        }

        Message mess = Message.builder()
                .roomId(roomId)
                .content(request.message())
                .sender(username)
                .timeStamp(LocalDateTime.now())
                .type(Content_Type.TEXT)
                .build();

        return messRepo.save(mess);
    }

    public Message sendDm(String user1, MessageRequest request, String user2) {


        //user1 - jisko send krna hai
        //user2 - jo send kr rha hai


        Users user = userRepo.findByUsername(user1).orElse(null);

        if(user == null) throw new RuntimeException("Invalid Username");

        //String roomId , String sender , String content

        //TODO: get or create the room first then create mess object send and then return

        boolean flag1 = roomRepo.existsByRoomId(user1+user2);

        boolean flag2 = roomRepo.existsByRoomId(user2+user1);

        Rooms room;

        //room id , user list , scope , pass , time , avl , number

        if( !(flag1 || flag2) ){
            room = Rooms.builder()
                    .roomId(user1+user2)
                    .timeStamp(LocalDateTime.now())
                    .users(List.of(user1 , user2))
                    .scopeVar(ScopeVar.DM)
                    .password(null)
                    .avlUser(Set.of(user1 , user2))
                    .numberAvlUser(2)
                    .build();
        }else{

            if(flag1) room = roomRepo.findByRoomId(user1+user2).orElse(null);

            else room = roomRepo.findByRoomId(user2+user1).orElse(null);
        }

        if(room == null) throw new RuntimeException("Internal Server Error");

        Message message = new Message(room.getRoomId() , user.getUsername() , request.message());

        messagingTemplate.convertAndSendToUser(
                user1 ,
                "/queue/dm",
                message
        );

        messagingTemplate.convertAndSendToUser(
                user2 ,
                "/queue/dm",
                message
        );

        return messRepo.save(message);
    }
}