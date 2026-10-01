package com.real_time.chat_app.DTOs;

import java.util.List;

public record ProfileResponse(
        String id ,
        String username,
        String name,
        String gmail,
        String imageUri ,
        List<String> friends,
        List<String> roomHistory
) {}