package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.MessageReadReceiptResponse;
import com.real_time.chat_app.Services.MessageReadReceiptService;
import com.real_time.chat_app.anno.ActiveUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/messages")
public class MessageReadReceiptController {

    private final MessageReadReceiptService readReceiptService;

    @ActiveUser
    @GetMapping("/{messageId}/read-receipts")
    public ResponseEntity<MessageReadReceiptResponse> getReadReceipts(
            @PathVariable String messageId,
            Principal principal
    ) {
        MessageReadReceiptResponse response =
                readReceiptService.getReadReceipts(
                        messageId,
                        principal.getName()
                );

        return ResponseEntity.ok(response);
    }
}