package com.real_time.chat_app.DTOs;

import java.util.List;

public record ProfileResponse(
        String userId,
        String name,
        String gmail,
        List<String> friends,
        List<String> roomHistory
) {}