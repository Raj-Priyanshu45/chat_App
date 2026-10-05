package com.real_time.chat_app.Services;

import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepo userRepo;
    private final roomRepo roomRepo;
    private final MemberRepo memberRepo;

    public Page<Users> retAllUsers(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return userRepo.findAll(pageable);
    }

    public Page<String> retUserByRoomId(String roomId) {

        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

        if (room == null) {
            log.warn("Wrong room");
            return null;
        }

        List<RoomMember> allUsers = memberRepo.findByRoomIdAndLeftAtIsNull(roomId);

        List<String> mem = allUsers.stream()
                .map(RoomMember::getUserId).toList();

        return new PageImpl<>(mem);
    }

    public Users saveOrShowUser(String userId) {

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) {
            throw new RuntimeException("User not found");
        }

        return userRepo.save(user);
    }
}
