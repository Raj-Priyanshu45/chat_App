package com.real_time.chat_app.DTOs;

public record MessageDelResponse(
        String type,
        String messageId,
        String roomId
) {
}