package com.real_time.chat_app.Models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document("room_members")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomMember {

    @Id
    private String id;

    private String roomId;
    private String userId;

    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
    private LocalDateTime lastReadMessageTime;
}