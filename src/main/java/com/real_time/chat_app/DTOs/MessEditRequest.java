package com.real_time.chat_app.DTOs;

public record MessEditRequest(
        String roomId ,
        String messId ,
        String updatedContent
) {
}
