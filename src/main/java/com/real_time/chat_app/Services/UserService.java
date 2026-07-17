package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.UserRequest;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepo userRepo;
    private final roomRepo roomRepo;

    public Page<Users> retAllUsers(int page , int size){
        Pageable pageable = PageRequest.of(page , size);
        return userRepo.findAll(pageable);
    }


    public Page<String> retUserByRoomId(String roomId){

        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

        if(room == null) {
            log.warn("Wrong room");
            return null;
        }

        List<String> allUsers = room.getUsers();

        return new PageImpl<>(allUsers);
    }

    public Users saveOrShowUser(){

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        assert auth != null;
        Jwt jwt = (Jwt) auth.getPrincipal();

        assert jwt != null;

        String kcId = jwt.getSubject();

        Users oldUser = userRepo.findByKcId(kcId).orElse(null);

        if(oldUser != null){
            return oldUser;
        }

        String name = jwt.getClaimAsString("name");
        String email = jwt.getClaimAsString("email");
        String userName = jwt.getClaimAsString("preferred_username");


        Users user = Users.builder()
                .kcId(kcId)
                .name(name)
                .gmail(email)
                .username(userName)
                .build();

        return userRepo.save(user);
    }
}
