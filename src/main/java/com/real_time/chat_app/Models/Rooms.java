package com.real_time.chat_app.Models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "rooms")
public class Rooms {

    @Id
    private String id;

    private String roomId;

//    private List<Message> mess = new ArrayList<>();

    @Builder.Default
    private List<String> users = new ArrayList<>();
}
