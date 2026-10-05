package com.real_time.chat_app.DTOs;

public record MessEditResponse(
        String type,
        String messageId,
        String updatedContent,
        String roomId
) {
}