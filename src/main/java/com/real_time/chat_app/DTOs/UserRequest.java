package com.real_time.chat_app.DTOs;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UserRequest(
        @NotBlank(message = "User-Name is required")
         String username ,
        @NotBlank(message = "Enter a name")
         String name ,
         @NotBlank(message = "Email is required")
         @Email(message = "Enter Valid Email")
         String gmail
) {
}
