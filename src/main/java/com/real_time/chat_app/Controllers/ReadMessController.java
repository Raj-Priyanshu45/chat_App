package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.UpdateReadMessage;
import com.real_time.chat_app.Services.ReadMessageService;
import com.real_time.chat_app.anno.ActiveUser;
import com.real_time.chat_app.enums.MessRead;
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
    @PatchMapping("room/{roomId}/read")
    public ResponseEntity<?> updateReadMessage(
            @PathVariable String roomId ,
            Principal principal ,
            @RequestBody UpdateReadMessage updatedMessId
            )
    {

        MessRead readStatus = readMessageService.readMessStatus(roomId , principal.getName() , updatedMessId.messId());

        if(readStatus == MessRead.Read){
            return ResponseEntity.status(200).body("Message Read Successfully");
        } else if (readStatus == MessRead.AlreadyRead) {
            return ResponseEntity.status(409).body("Message Already Read");
        } else if (readStatus == MessRead.RoomNotFound) {
            return ResponseEntity.status(404).body("Invalid room request");
        } else if (readStatus == MessRead.InvalidUser) {
            return ResponseEntity.status(404).body("User Not part of the room");
        } else if (readStatus == MessRead.InvalidRequest) {
            return ResponseEntity.status(409).body("Wrong timestamp");

        }

        return ResponseEntity.status(404).body("Message Not Found");
    }
}
