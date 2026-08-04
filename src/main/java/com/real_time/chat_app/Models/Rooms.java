package com.real_time.chat_app.Models;

import com.mongodb.lang.Nullable;
import com.real_time.chat_app.enums.ScopeVar;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

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

    private ScopeVar scopeVar;

    @Nullable
    private String password;

    private LocalDateTime timeStamp;

    @Builder.Default
    private Set<String> avlUser = new HashSet<>();

    private int numberAvlUser;


}
