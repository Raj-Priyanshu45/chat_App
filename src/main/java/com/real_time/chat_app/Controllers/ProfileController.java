package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Services.ProfileService;
import com.real_time.chat_app.Services.UserService;
import com.real_time.chat_app.anno.ActiveUser;
import com.real_time.chat_app.jwt.JwtCreation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final UserService userService;


    @ActiveUser
    @GetMapping("/me")
    public ResponseEntity<?> saveOrShowUser(Principal principal){

        Users user = userService.saveOrShowUser(principal.getName());

        return ResponseEntity.ok(profileService.retProfileDetails(user.getId()));
    }

    private final JwtCreation jwtCreation;   // add next to the other final fields

    @ActiveUser
    @GetMapping("/ws-ticket")
    public ResponseEntity<?> wsTicket(Principal principal) {
        return ResponseEntity.ok(Map.of("ticket", jwtCreation.generateWsTicket(principal.getName())));
    }

    @ActiveUser
    @GetMapping("/get-details/{userId}")
    public ResponseEntity<?> getOthersProfile(@PathVariable String userId){
        return ResponseEntity.status(200).body(profileService.getUserProfile(userId));
    }
}
