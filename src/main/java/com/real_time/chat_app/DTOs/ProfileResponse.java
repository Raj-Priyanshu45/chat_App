package com.real_time.chat_app.DTOs;

import java.util.List;

public record ProfileResponse(
        String kcId,
        String username,
        String name,
        String gmail,
        List<String> friends,
        List<String> roomHistory
) {}