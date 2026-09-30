package com.real_time.chat_app.Models;

import com.real_time.chat_app.enums.EmailVerificationState;
import com.real_time.chat_app.enums.Provider;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document
@Builder
public class UserAuth {

    @Id
    private String id;

    private String userId;

    private LocalDateTime createdAt;

    private String password;

    private Provider provider;

    private String hashedRefreshToken;

    private EmailVerificationState emailState;
}
