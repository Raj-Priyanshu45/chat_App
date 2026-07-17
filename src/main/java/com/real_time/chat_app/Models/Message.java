package com.real_time.chat_app.Models;

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

    public Message(String sender , String content){
        this.sender = sender;
        this.content = content;
        this.timeStamp = LocalDateTime.now();
    }
}
