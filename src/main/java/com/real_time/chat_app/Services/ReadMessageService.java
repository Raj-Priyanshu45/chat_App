package com.real_time.chat_app.Services;

import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.MessRead;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReadMessageService {

    private final roomRepo roomRepo;
    private final MemberRepo memberRepo;
    private final MessRepo messRepo;

    public MessRead readMessStatus(String roomId, String userId, String readMessId) {

        Rooms room = roomRepo.findByRoomId(roomId).orElse(null);

        if(room == null) {
            log.warn("Invalid Room Request by userId {} to roomId {}",userId , roomId);
            return MessRead.RoomNotFound;
        }

        RoomMember member = memberRepo.findByRoomIdAndUserIdAndLeftAtIsNull(roomId , userId).orElse(null);

        if(member == null){
            log.warn("User {} does not belong to roomId {}", userId , roomId);
            return MessRead.InvalidUser;
        }

        Message message = messRepo.findById(readMessId).orElse(null);

        if(message == null){
            log.warn("Invalid mess request by userid-{}",userId);
            return MessRead.MessNotFound;
        }

        if(member.getLastReadMessId().equals(readMessId)){
            log.info("request repeated for reading mess with id {}",readMessId);
            return MessRead.AlreadyRead;
        }

        if(member.getLastReadMessageTime().isBefore(LocalDateTime.now())){
            log.info("Invalid request for updating mess prev time");
            return MessRead.InvalidRequest;
        }

        member.setLastReadMessId(readMessId);
        member.setLastReadMessageTime(message.getTimeStamp());

        memberRepo.save(member);

        return MessRead.Read;
    }
}
