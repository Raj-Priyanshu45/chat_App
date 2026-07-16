package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.roomId;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.roomRepo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class roomServices {

    private final roomRepo repo;

    public Rooms createRoom(@Valid roomId roomId) {

        Rooms room = repo.findByRoomId(roomId.roomId()).orElse(null);

        if(room != null) return null;

        Rooms newRoom = Rooms.builder()
                .roomId(roomId.roomId())
                .build();

        return repo.save(newRoom);
    }

    public Rooms retRoomDetails(String roomId) {
        return repo.findByRoomId(roomId).orElse(null);
    }

    public Page<Message> retAllMess(String roomId , int page , int size) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if(room == null) return null;

        List<Message> messages = room.getMess();

        int start = Math.max(0 , messages.size() - (page + 1) * size);

        int end = Math.min(messages.size() , start+size);

        List<Message> pagedMessage = messages.subList(start , end);

        return new PageImpl<>(pagedMessage);
    }
}
