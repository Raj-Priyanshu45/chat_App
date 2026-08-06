package com.real_time.chat_app.Models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.HashSet;
import java.util.Set;

@Document
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserExtras {

    @Id
    private String id;

    private String username;

    @Builder.Default
    private Set<String> roomId = new HashSet<>();

    @Builder.Default
    private Set<String> friends = new HashSet<>();
}
