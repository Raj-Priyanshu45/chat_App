package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.roomId;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class roomServices {

    private final roomRepo repo;
    private final MessRepo messRepo;
    private final UserRepo userRepo;

    public Rooms createRoom(@Valid roomId roomId ) {

        Rooms room = repo.findByRoomId(roomId.roomId()).orElse(null);

        String kcId = ((Jwt) SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal())
                .getSubject();

        if(kcId == null || kcId.isEmpty())  return null;


        Users user = userRepo.findByKcId(kcId).orElse(null);

        if(user == null) return null;

        if(room != null) return null;

        Rooms newRoom = Rooms.builder()
                .roomId(roomId.roomId())
                .users(List.of(user.getUsername()))
                .build();

        return repo.save(newRoom);
    }

    public Rooms retRoomDetails(String roomId) {

        String kcId = ((Jwt) SecurityContextHolder.getContext()
                .getAuthentication()
                .getPrincipal())
                .getSubject();

        if(kcId == null || kcId.isEmpty())  return null;


        Users user = userRepo.findByKcId(kcId).orElse(null);

        if (user == null) return null;

        log.info("Request for join room");
        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if(room == null)  return null;

        if(!room.getUsers().contains(user.getUsername())) {

            room.getUsers().add(user.getUsername());
            repo.save(room);
        }

        return room;
    }

    public Page<Message> retAllMess(String roomId , int page , int size) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if(room == null) return null;

        List<Message> messages = messRepo.findByRoomId(roomId);

        log.info("Request for retreiving message");

        int start = Math.max(0 , messages.size() - (page + 1) * size);

        int end = Math.min(messages.size() , start+size);

        List<Message> pagedMessage = messages.subList(start , end);

        return new PageImpl<>(pagedMessage);
    }

    public List<Message> retMessSince(String roomId, LocalDateTime timestamp) {
        return messRepo.findByRoomIdAndTimeStampAfterOrderByTimeStampAsc(roomId , timestamp);
    }
}
