package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.UserRequest;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/")
    public ResponseEntity<?> retAllUsers(
            @RequestParam(value = "page" , defaultValue = "0" , required = false) int pageNumber ,
            @RequestParam(value = "size" , defaultValue = "20" , required = false) int size
    ){
        return ResponseEntity.ok(userService.retAllUsers(pageNumber , size));
    }

    @PreAuthorize("hasRole('USER')")
    @GetMapping("/me")
    public ResponseEntity<?> saveOrShowUser(){

        return ResponseEntity.ok(userService.saveOrShowUser());
    }
}
