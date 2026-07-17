package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class chatService {

    private final roomRepo roomRepo;

    private final UserRepo userRepo;

    private final MessRepo messRepo;

    public Message sendMessage(MessageRequest request , String roomId){

        Boolean roomFlag = roomRepo.existsByRoomId(roomId);

        boolean userFlag = userRepo.existsByUsername(request.userName());

        if(!roomFlag){
            log.debug("Unknown Room");
            throw new RuntimeException("Room Not Found");
        }

        if(!userFlag){
            log.warn("UnAuthorized Attempt");
            throw new RuntimeException("UnAuthorized Attempt");
        }

        Message mess = Message.builder()
                .roomId(roomId)
                .content(request.message())
                .sender(request.userName())
                .timeStamp(LocalDateTime.now())
                .build();

        return messRepo.save(mess);
    }
}
