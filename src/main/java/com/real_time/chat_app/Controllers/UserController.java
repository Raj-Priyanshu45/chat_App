package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.UserRequest;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/")
    public ResponseEntity<?> retAllUsers(
            @RequestParam(value = "page" , defaultValue = "0" , required = false) int pageNumber ,
            @RequestParam(value = "size" , defaultValue = "20" , required = false) int size
    ){
        return ResponseEntity.ok(userService.retAllUsers(pageNumber , size));
    }

    @GetMapping("/me")
    public ResponseEntity<?> saveOrShowUser(){

        return ResponseEntity.ok(userService.saveOrShowUser());
    }
}
