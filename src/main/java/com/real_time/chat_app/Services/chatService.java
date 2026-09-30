package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.ExtrasRepo;
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
    private final ExtrasRepo extraRepo;

    public Message sendMessage(MessageRequest request, String roomId, String userId) {

        Boolean roomFlag = roomRepo.existsByRoomId(roomId);
        boolean userFlag = userRepo.existsById(userId);

        if (!roomFlag) {
            throw new RuntimeException("Room Not Found");
        }

        if (!userFlag) {
            throw new RuntimeException("UnAuthorized Attempt");
        }

        Message mess = Message.builder()
                .roomId(roomId)
                .content(request.message())
                .sender(userId)
                .timeStamp(LocalDateTime.now())
                .type(Content_Type.TEXT)
                .build();

        return messRepo.save(mess);
    }

    public Message sendDm(String user1, MessageRequest request, String user2) {

        Users user = userRepo.findById(user1).orElse(null);

        Users nextUser = userRepo.findById(user2).orElse(null);

        if (user == null || nextUser == null) {
            throw new RuntimeException("Invalid UserId");
        }

        UserExtras extras1 = extraRepo.findByUserId(user.getId()).orElse(null);

        if (extras1 == null) {
            extras1 = UserExtras.builder()
                    .userId(user.getId())
                    .friends(Set.of(user2))
                    .build();

        } else {
            extras1.getFriends().add(user2);
        }

        extraRepo.save(extras1);

        UserExtras extras2 = extraRepo.findByUserId(user2).orElse(null);

        if (extras2 == null) {
            extras2 = UserExtras.builder()
                    .userId(user2)
                    .friends(Set.of(user1))
                    .build();

        } else {
            extras2.getFriends().add(user1);
        }

        extraRepo.save(extras2);

        String roomId = getDmRoomId(user1, user2);

        boolean flag = roomRepo.existsByRoomId(roomId);

        Rooms room;

        if (!flag) {
            room = Rooms.builder()
                    .roomId(roomId)
                    .timeStamp(LocalDateTime.now())
                    .users(List.of(user1, user2))
                    .scopeVar(ScopeVar.DM)
                    .password(null)
                    .avlUser(Set.of(user1, user2))
                    .numberAvlUser(2)
                    .build();

            roomRepo.save(room);
        } else {
            room = roomRepo.findByRoomId(roomId).orElse(null);
        }

        if (room == null) {
            throw new RuntimeException("Internal Server Error");
        }

        Message message = new Message(room.getRoomId(), user.getId(), request.message());

        messagingTemplate.convertAndSendToUser(
                user1,
                "/queue/dm",
                message
        );

        messagingTemplate.convertAndSendToUser(
                user2,
                "/queue/dm",
                message
        );

        return messRepo.save(message);
    }

    private String getDmRoomId(String user1, String user2) {
        return user1.compareTo(user2) < 0 ? user1 + user2 : user2 + user1;
    }
}