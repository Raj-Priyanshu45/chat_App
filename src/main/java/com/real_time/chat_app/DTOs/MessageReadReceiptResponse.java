package com.real_time.chat_app.DTOs;

import java.util.List;

public record MessageReadReceiptResponse(
        String messageId,
        List<String> readerIds,
        long readCount,
        long totalRecipients
) {}