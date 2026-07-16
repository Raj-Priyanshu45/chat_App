package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class chatService {

    private final roomRepo roomRepo;

    public Message sendMessage(MessageRequest request , String roomId){

        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

        if(room == null){
            throw new RuntimeException("Room Not Found");
        }

        Message mess = Message.builder()
                .content(request.message())
                .sender(request.sender())
                .timeStamp(LocalDateTime.now())
                .build();

        room.getMess().add(mess);
        roomRepo.save(room);

        return mess;
    }
}
