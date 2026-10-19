
package com.real_time.chat_app.Services;

import com.mongodb.client.result.UpdateResult;
import com.real_time.chat_app.DTOs.ReadMessageResponse;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Repo.MemberRepo;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReadMessageService {

    private final roomRepo roomRepo;
    private final MemberRepo memberRepo;
    private final MessRepo messRepo;
    private final MongoTemplate mongoTemplate;

    public ReadMessageResponse readMessStatus(
            String roomId,
            String userId,
            String readMessId
    ) {

        // 1. Validate the room.
        if (!roomRepo.existsByRoomId(roomId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Room not found"
            );
        }

        // 2. Find active membership.
        RoomMember member = memberRepo
                .findByRoomIdAndUserIdAndLeftAtIsNull(roomId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "User is not an active member of this room"
                ));

        // 3. Find the requested message.
        Message message = messRepo.findById(readMessId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Message not found"
                ));

        // 4. Prevent using a message from another room.
        if (!roomId.equals(message.getRoomId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Message not found in this room"
            );
        }

        LocalDateTime messageTime = message.getTimeStamp();

        if (messageTime == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Message timestamp is missing"
            );
        }

        // 5. Fast path: the pointer is already at or beyond
        // the requested timestamp.
        LocalDateTime currentTime = member.getLastReadMessageTime();

        if (currentTime != null
                && !messageTime.isAfter(currentTime)) {

            return new ReadMessageResponse(
                    member.getLastReadMessId(),
                    currentTime,
                    false
            );
        }

        // 6. Atomically advance the pointer only if the saved
        // position is still older than the requested message.
        Query query = new Query(
                new Criteria().andOperator(
                        Criteria.where("roomId").is(roomId),
                        Criteria.where("userId").is(userId),
                        Criteria.where("leftAt").is(null),
                        new Criteria().orOperator(
                                Criteria.where("lastReadMessageTime")
                                        .is(null),
                                Criteria.where("lastReadMessageTime")
                                        .lt(messageTime)
                        )
                )
        );

        Update update = new Update()
                .set("lastReadMessId", message.getId())
                .set("lastReadMessageTime", messageTime);

        UpdateResult result = mongoTemplate.updateFirst(
                query,
                update,
                RoomMember.class
        );

        if (result.getModifiedCount() == 1) {
            log.debug(
                    "Read position advanced for user {} in room {} to message {}",
                    userId, roomId, message.getId()
            );

            return new ReadMessageResponse(
                    message.getId(),
                    messageTime,
                    true
            );
        }

        // 7. Another request may have advanced the pointer first.
        // Read the latest saved state instead of returning stale data.
        RoomMember latestMember = memberRepo
                .findByRoomIdAndUserIdAndLeftAtIsNull(roomId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "User is no longer an active member of this room"
                ));

        return new ReadMessageResponse(
                latestMember.getLastReadMessId(),
                latestMember.getLastReadMessageTime(),
                false
        );
    }
}
