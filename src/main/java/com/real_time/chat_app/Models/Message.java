package com.real_time.chat_app.Models;

import com.real_time.chat_app.enums.Content_Type;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "messages")
public class Message {

    @Id
    private String id;
    private String roomId;
    private String sender;
    private String content;
    private LocalDateTime timeStamp;
    private Content_Type type;

    public Message(String roomId , String sender , String content){
        this.roomId = roomId;
        this.sender = sender;
        this.content = content;
        this.timeStamp = LocalDateTime.now();
        this.type = Content_Type.TEXT;
    }

    public Message(String roomId , String sender , String content , Content_Type type){
        this.roomId = roomId;
        this.sender = sender;
        this.content = content;
        this.timeStamp = LocalDateTime.now();
        this.type = type;
    }
}
