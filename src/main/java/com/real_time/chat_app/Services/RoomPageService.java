package com.real_time.chat_app.Services;

import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomPageService {

    private final UserRepo userRepo;
    private final MemberRepo memberRepo;

    public List<?> extractAllRooms(String name) {

        if(!userRepo.existsById(name)) throw new RuntimeException("User Not Found");

        return memberRepo.findByUserIdAndLeftAtIsNull(name).stream()
                .map(RoomMember::getRoomId).toList();
    }
}
