package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Services.RoomPageService;
import com.real_time.chat_app.Services.roomServices;
import com.real_time.chat_app.anno.ActiveUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1")
public class homeController {

    private final roomServices roomService;
    private final RoomPageService roomPageService;

    @GetMapping("/home")
    public ResponseEntity<?> homePage(
            @RequestParam(name = "size" , defaultValue = "10") int size ,
            @RequestParam(name = "number" , defaultValue = "0") int number ,
            @RequestParam(name = "sortBy" , defaultValue = "") String sortBy
    ){
        return ResponseEntity.ok(roomService.getSortedPage(size , number , sortBy));
    }

    @PostMapping("/ret-rooms")
    @ActiveUser
    public ResponseEntity<?> getHomePageResponse(Principal principal){
        return ResponseEntity.status(200).body(roomPageService.extractAllRooms(principal.getName()));
    }

}
