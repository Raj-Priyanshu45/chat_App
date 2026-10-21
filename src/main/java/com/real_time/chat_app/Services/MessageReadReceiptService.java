package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.MessageReadReceiptResponse;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.RoomMember;
import com.real_time.chat_app.Repo.MessRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageReadReceiptService {

    private final MessRepo messRepo;
    private final MongoTemplate mongoTemplate;

    public MessageReadReceiptResponse getReadReceipts(
            String messageId,
            String userId
    ) {

        // 1. Find the message.
        Message message = messRepo.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Message not found"
                ));

        // 2. Only the sender can view the read receipts.
        if (!userId.equals(message.getSender())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the message sender can view read receipts"
            );
        }

        if (message.getTimeStamp() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Message timestamp is missing"
            );
        }

        String roomId = message.getRoomId();

        // 3. Count active recipients, excluding the sender.
        Query recipientsQuery = new Query(
                Criteria.where("roomId").is(roomId)
                        .and("leftAt").is(null)
                        .and("userId").ne(userId)
        );

        long totalRecipients = mongoTemplate.count(
                recipientsQuery,
                RoomMember.class
        );

        // 4. Find active recipients whose read pointer
        // has reached or passed this message's timestamp.
        Query readQuery = new Query(
                Criteria.where("roomId").is(roomId)
                        .and("leftAt").is(null)
                        .and("userId").ne(userId)
                        .and("lastReadMessageTime")
                        .gte(message.getTimeStamp())
        );

        // Retrieve only userId instead of every membership field.
        readQuery.fields().include("userId");

        List<String> readerIds = mongoTemplate
                .find(readQuery, RoomMember.class)
                .stream()
                .map(RoomMember::getUserId)
                .toList();

        // 5. Return IDs and counts.
        return new MessageReadReceiptResponse(
                messageId,
                readerIds,
                readerIds.size(),
                totalRecipients
        );
    }
}