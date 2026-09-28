package com.real_time.chat_app.Models;

import com.real_time.chat_app.enums.AccountState;
import com.real_time.chat_app.enums.Role;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "app_user")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Users {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;
    private String name;
    private String gmail;
    private Role role;
    private AccountState state;
}
