package com.real_time.chat_app.DTOs;

public record MessEditResponse (
        String updatedContent ,
        String messId ,
        String roomId
){
}
