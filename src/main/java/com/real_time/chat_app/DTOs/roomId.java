package com.real_time.chat_app.DTOs;

import com.real_time.chat_app.enums.Content_Type;
import com.real_time.chat_app.enums.ScopeVar;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record roomId (
        @NotBlank
        @Size(
                min = 4
        )
        String roomId ,
        @NotNull
        ScopeVar var ,
        String password
){
}
