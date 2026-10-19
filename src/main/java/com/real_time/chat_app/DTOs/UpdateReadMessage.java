package com.real_time.chat_app.DTOs;

import jakarta.validation.constraints.NotBlank;

public record UpdateReadMessage(
        @NotBlank(message = "Message ID is required")
        String messId
) {
}
