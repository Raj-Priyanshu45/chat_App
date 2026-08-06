package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.joinRoom;
import com.real_time.chat_app.DTOs.roomId;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.ScopeVar;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.apache.catalina.User;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class roomServices {

    private final roomRepo repo;
    private final MessRepo messRepo;
    private final UserRepo userRepo;
    private final ExtrasRepo extraRepo;

    public Rooms createRoom(@Valid roomId roomId , String username) {

        Rooms room = repo.findByRoomId(roomId.roomId()).orElse(null);

        Users user = userRepo.findByUsername(username).orElse(null);

        if(user == null) return null;

        if(room != null) return null;

        Rooms newRoom = Rooms.builder()
                .roomId(roomId.roomId())
                .users(List.of(user.getUsername()))
                .scopeVar(roomId.var())
                .timeStamp(LocalDateTime.now())
                .password(roomId.var() == ScopeVar.Public ? null : roomId.password())
                .avlUser(Set.of(user.getUsername()))
                .numberAvlUser(1)
                .build();

        return repo.save(newRoom);
    }

    public Rooms retRoomDetails(joinRoom roomInfo , String username) {

        Users user = userRepo.findByUsername(username).orElse(null);

        if (user == null) return null;

        log.info("Request for join room");
        Rooms room = repo.findByRoomId(roomInfo.roomId()).orElse(null);

        if(room == null)  return null;

        if(room.getScopeVar() == ScopeVar.Private){
            if(!Objects.equals(room.getPassword() , roomInfo.password())) throw new RuntimeException("Invalid Room Id or Password");
        }

        UserExtras extras = extraRepo.findByUsername(username).orElse(null);

        if(extras == null){

            extras = UserExtras.builder()
                    .username(username)
                    .roomId(room.getScopeVar() != ScopeVar.DM ? Set.of(roomInfo.roomId()) : Set.of())
                    .build();


        }else {
            extras.getRoomId().add(roomInfo.roomId());
        }

        extraRepo.save(extras);

        if(!room.getAvlUser().contains(user.getUsername())) {

            room.getUsers().add(user.getUsername());
            room.getAvlUser().add(user.getUsername());
            room.setNumberAvlUser(room.getNumberAvlUser() + 1);
            repo.save(room);
        }

        return room;
    }

    public Page<Message> retAllMess(String roomId , int page , int size) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if(room == null) return null;

        List<Message> messages = messRepo.findByRoomId(roomId);

        log.info("Request for retrieving message");

        int start = Math.max(0 , messages.size() - (page + 1) * size);

        int end = Math.min(messages.size() , start+size);

        List<Message> pagedMessage = messages.subList(start , end);

        return new PageImpl<>(pagedMessage);
    }

    public List<Message> retMessSince(String roomId, LocalDateTime timestamp) {
        return messRepo.findByRoomIdAndTimeStampAfterOrderByTimeStampAsc(roomId , timestamp);
    }

    public Page<?> getSortedPage(int size , int number , String sortedBy){


        //TODO: Implement the number of available user and set the number of count
        String type = sortedBy.equalsIgnoreCase("timestamp") ? "timeStamp" : "numberAvlUser";

        Pageable pageable = PageRequest.of(
                number ,
                size ,
                Sort.by(type).descending()
        );

        return repo.findByScopeVar(ScopeVar.Public , pageable);
    }

    public void leaveRoom(String roomId , String userId){

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if(room == null) return;

        Users user = userRepo.findByUsername(userId).orElse(null);

        if(user == null) return;

        if(!room.getAvlUser().contains(user.getUsername())) return;

        room.getAvlUser().remove(user.getUsername());

        room.setNumberAvlUser(room.getNumberAvlUser() - 1);

        repo.save(room);
    }

    public List<String> getAllMembers(String roomId) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if (room == null) {
            throw new RuntimeException("Room Not Found");
        }

        return room.getAvlUser().stream().toList();
    }
}
