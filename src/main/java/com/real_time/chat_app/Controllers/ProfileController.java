package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Services.ProfileService;
import com.real_time.chat_app.Services.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final UserService userService;


    @PreAuthorize("hasRole('USER')")
    @GetMapping("/me")
    public ResponseEntity<?> saveOrShowUser(){

        Users user = userService.saveOrShowUser();

        return ResponseEntity.ok(profileService.retProfileDetails(user.getUsername()));
    }
}
