package com.real_time.chat_app.DTOs;

import com.real_time.chat_app.enums.ScopeVar;
import java.time.LocalDateTime;

public record PublicRoomResponse(
        String roomId,
        ScopeVar scopeVar,
        LocalDateTime timeStamp,
        long memberCount
) {}