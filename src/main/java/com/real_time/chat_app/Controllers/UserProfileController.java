package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Services.ProfileUpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/update")
@RequiredArgsConstructor
public class UserProfileController {

    private final ProfileUpdateService profileUpdateService;

    @PostMapping("/image")
    public ResponseEntity<?> updateProfile(@RequestParam MultipartFile file , @AuthenticationPrincipal Jwt jwt){
        if(profileUpdateService.updateImage(jwt.getSubject() , file)){
            return ResponseEntity.status(201).body("");
        }
        return ResponseEntity.internalServerError().build();
    }
}
