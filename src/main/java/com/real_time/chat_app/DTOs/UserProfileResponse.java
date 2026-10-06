package com.real_time.chat_app.DTOs;

public record UserProfileResponse(
        String username,
        String name,
        String profilePicUrl
) {}