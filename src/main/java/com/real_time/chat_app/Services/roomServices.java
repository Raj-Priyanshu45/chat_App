package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.joinRoom;
import com.real_time.chat_app.DTOs.roomId;
import com.real_time.chat_app.Models.*;
import com.real_time.chat_app.Repo.*;
import com.real_time.chat_app.enums.ScopeVar;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
    private final MemberRepo memberRepo;

    public Rooms createRoom(@Valid roomId roomId, String userId) {

        Rooms room = repo.findByRoomId(roomId.roomId()).orElse(null);

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) return null;

        if (room != null) return null;

        Rooms newRoom = Rooms.builder()
                .roomId(roomId.roomId())
                .scopeVar(roomId.var())
                .timeStamp(LocalDateTime.now())
                .password(roomId.var() == ScopeVar.Public ? null : roomId.password())
                .build();

        RoomMember member = RoomMember.builder()
                .userId(userId)
                .roomId(roomId.roomId())
                .leftAt(null)
                .lastReadMessageTime(LocalDateTime.now())
                .joinedAt(LocalDateTime.now())
                .build();

        memberRepo.save(member);

        return repo.save(newRoom);
    }

    public Rooms retRoomDetails(joinRoom roomInfo, String userId) {

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) return null;

        log.info("Request for join room");

        Rooms room = repo.findByRoomId(roomInfo.roomId()).orElse(null);

        if (room == null) return null;

        if (room.getScopeVar() == ScopeVar.Private) {
            if (!Objects.equals(room.getPassword(), roomInfo.password())) {
                throw new RuntimeException("Invalid Room Id or Password");
            }
        }

        UserExtras extras = extraRepo.findByUserId(user.getId()).orElse(null);

        if (extras == null) {

            extras = UserExtras.builder()
                    .userId(user.getId())
                    .roomId(room.getScopeVar() != ScopeVar.DM
                            ? Set.of(roomInfo.roomId())
                            : Set.of())
                    .build();

        } else {
            extras.getRoomId().add(roomInfo.roomId());
        }

        extraRepo.save(extras);

//        if (!room.getAvlUser().contains(user.getId())) {
//
//            room.getUsers().add(user.getId());
//            room.getAvlUser().add(user.getId());
//
//            repo.save(room);
//        }

        RoomMember member = memberRepo.findByUserIdAndRoomId(userId , roomInfo.roomnId()).orElse(null);

        if(member == null){
            member = RoomMember.builder()
                    .joinedAt(LocalDateTime.now())
                    .roomId(roomInfo.roomId())
                    .leftAt(null)
                    .lastReadMessageTime(LocalDateTime.now())
                    .userId(userId)
                    .build();

            memberRepo.save(member);
        } 

        else if (member.getLeftAt() != null){

            member.setLeftAt(null);
            member.setJoinedAt(LocalDateTime.now());
        }

        memberRepo.save(member);

        return room;
    }

    public Page<Message> retAllMess(String roomId, int page, int size) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if (room == null) return null;

        List<Message> messages = messRepo.findByRoomIdAndDelFalse(roomId);

        log.info("Request for retrieving message of room id {}", roomId);

        int start = Math.max(0, messages.size() - (page + 1) * size);

        int end = Math.min(messages.size(), start + size);

        List<Message> pagedMessage = messages.subList(start, end);

        return new PageImpl<>(pagedMessage);
    }

    public List<Message> retMessSince(String roomId, LocalDateTime timestamp) {
        return messRepo.findByRoomIdAndDelFalseAndTimeStampAfterOrderByTimeStampAsc(
                roomId,
                timestamp
        );
    }

    public Page<?> getSortedPage(int size, int number, String sortedBy) {

        String type = sortedBy.equalsIgnoreCase("timestamp")
                ? "timeStamp"
                : "numberAvlUser";

        Pageable pageable = PageRequest.of(
                number,
                size,
                Sort.by(type).descending()
        );

        return repo.findByScopeVar(
                ScopeVar.Public,
                pageable
        );
    }

    public void leaveRoom(String roomId, String userId) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if (room == null) return;

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) return;

//        if (!room.getAvlUser().contains(user.getId())) return;
//
//        room.getAvlUser().remove(user.getId());

        RoomMember member = memberRepo.findByUserIdAndRoomId(userId , roomId).orElse(null);

        if(member == null){
            log.warn("Wrong attempt to leave room by {} room id {}" , userId , roomId);
            throw new RuntimeException("Member Not Found");
        }

        member.setLeftAt(LocalDateTime.now());

        memberRepo.save(member);

        repo.save(room);
    }

    public List<String> getAllMembers(String roomId) {

        Rooms room = repo.findByRoomId(roomId).orElse(null);

        if (room == null) {
            throw new RuntimeException("Room Not Found");
        }

        List<RoomMember> avlMember = memberRepo.findByRoomIdAndLeftAtIsNull(roomId);

        return avlMember.stream()
                .map(RoomMember::getUserId).toList();
    }
}
