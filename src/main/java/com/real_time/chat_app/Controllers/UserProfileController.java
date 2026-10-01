package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Services.ProfileUpdateService;
import com.real_time.chat_app.anno.ActiveUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;

@RestController
@RequestMapping("/update")
@RequiredArgsConstructor
public class UserProfileController {

    private final ProfileUpdateService profileUpdateService;

    @PostMapping("/image")
    @ActiveUser
    public ResponseEntity<?> updateProfile(@RequestParam MultipartFile file , Principal principal){
        if(profileUpdateService.updateImage(principal.getName(), file)){
            return ResponseEntity.status(201).body("");
        }
        return ResponseEntity.internalServerError().build();
    }
}
