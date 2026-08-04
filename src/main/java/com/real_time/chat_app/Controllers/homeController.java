package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Services.roomServices;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1")
public class homeController {

    private final roomServices roomService;

    @GetMapping("/home")
    public ResponseEntity<?> homePage(
            @RequestParam(name = "size" , defaultValue = "10") int size ,
            @RequestParam(name = "number" , defaultValue = "0") int number ,
            @RequestParam(name = "sortBy" , defaultValue = "") String sortBy
    ){
        return ResponseEntity.ok(roomService.getSortedPage(size , number , sortBy));
    }
}
