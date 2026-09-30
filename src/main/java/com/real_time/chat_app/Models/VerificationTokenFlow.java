package com.real_time.chat_app.Models;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VerificationTokenFlow {

    @Id
    private String id;

    private String email;

    private String token;

    private LocalDateTime expirationTime;

    private String userId;
}
