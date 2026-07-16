package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.roomId;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Services.roomServices;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class roomController {

    private final roomServices roomServices;

    //create rooms
    @PostMapping("/create")
    public ResponseEntity<?> createRooms(@RequestBody @Valid roomId roomId){

        Rooms room = roomServices.createRoom(roomId);

        if(room == null){
            return ResponseEntity.status(409).body("Room is already there");
        }

        URI loc = URI.create("api/v1/rooms"+room.getId());

        return ResponseEntity.created(loc).body(room);
    }


    @GetMapping("/{roomId}")
    public ResponseEntity<?> getRoom(@PathVariable String roomId){

        Rooms room = roomServices.retRoomDetails(roomId);

        if(room == null)
            return ResponseEntity.status(404).body("Room Not Found");

        return ResponseEntity.ok(room);
    }

    @PostMapping("/{roomId}/messages")
    public ResponseEntity<?> getAllMessages(
            @PathVariable String roomId ,
            @RequestParam(value = "page" , defaultValue = "0" , required = false) int page,
            @RequestParam(value = "size" , defaultValue = "20" , required = false) int size
    ){

        Page<Message> messages = roomServices.retAllMess(roomId , page , size);

        if(messages == null){
            return ResponseEntity.status(404).body("Room Not Found");
        }

        return ResponseEntity.ok(messages);
    }
}
