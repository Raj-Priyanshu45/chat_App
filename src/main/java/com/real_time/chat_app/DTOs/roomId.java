package com.real_time.chat_app.DTOs;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record roomId (
        @NotBlank
        @Size(
                min = 4 ,
                max = 8
        )
        String roomId
){
}
