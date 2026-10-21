
package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.ReadMessageResponse;
import com.real_time.chat_app.DTOs.UnreadMessageResponse;
import com.real_time.chat_app.DTOs.UpdateReadMessage;
import com.real_time.chat_app.Services.ReadMessageService;
import com.real_time.chat_app.anno.ActiveUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class ReadMessController {

    private final ReadMessageService readMessageService;

    @ActiveUser
    @PatchMapping("/rooms/{roomId}/read")
    public ResponseEntity<ReadMessageResponse> updateReadMessage(
            @PathVariable String roomId,
            Principal principal,
            @Valid @RequestBody UpdateReadMessage request
    ) {

        ReadMessageResponse response =
                readMessageService.readMessStatus(
                        roomId,
                        principal.getName(),
                        request.messId()
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/rooms/{roomId}/unread-count")
    public ResponseEntity<UnreadMessageResponse> getUnreadMessageCount(
            @PathVariable String roomId,
            Principal principal
    ) {
        long unreadCount = readMessageService.unreadMessCount(
                roomId,
                principal.getName()
        );

        return ResponseEntity.ok(
                new UnreadMessageResponse(unreadCount)
        );
    }
}
