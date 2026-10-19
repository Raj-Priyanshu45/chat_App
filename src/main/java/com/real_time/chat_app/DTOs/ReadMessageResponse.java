
package com.real_time.chat_app.DTOs;

import java.time.LocalDateTime;

public record ReadMessageResponse(
        String lastReadMessageId,
        LocalDateTime lastReadMessageTime,
        boolean updated
) {
}
