package com.real_time.chat_app.Models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document("room_members")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@CompoundIndex(
        name = "room_user_unique" ,
        def = "{'roomId':1 , 'userId':1}",
        unique = true
)
public class RoomMember {

    @Id
    private String id;

    private String roomId;
    private String userId;

    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
    private LocalDateTime lastReadMessageTime;
    private String lastReadMessId;
}