package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.UserRequest;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Services.ProfileService;
import com.real_time.chat_app.Services.UserService;
import com.real_time.chat_app.anno.ActiveUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final ProfileService profileService;

    @ActiveUser
    @GetMapping("/")
    public ResponseEntity<?> retAllUsers(
            @RequestParam(value = "page" , defaultValue = "0" , required = false) int pageNumber ,
            @RequestParam(value = "size" , defaultValue = "20" , required = false) int size
    ){
        return ResponseEntity.ok(userService.retAllUsers(pageNumber , size));
    }

    @ActiveUser
    @GetMapping("/lookup")
    public ResponseEntity<Map<String, String>> lookup(@RequestParam List<String> ids) {
        return ResponseEntity.ok(profileService.usernamesById(ids));
    }
}
