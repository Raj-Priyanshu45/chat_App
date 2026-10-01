package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Services.ProfileService;
import com.real_time.chat_app.Services.ProfileUpdateService;
import com.real_time.chat_app.anno.ActiveUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/update")
@RequiredArgsConstructor
public class UserProfileController {

    private final ProfileUpdateService profileUpdateService;
    private final ProfileService profileService;

    @PostMapping("/image")
    @ActiveUser
    public ResponseEntity<?> updateProfile(@RequestParam MultipartFile file , Principal principal){
        if(profileUpdateService.updateImage(principal.getName(), file)){
            return ResponseEntity.status(201).body("");
        }
        return ResponseEntity.internalServerError().build();
    }
}
