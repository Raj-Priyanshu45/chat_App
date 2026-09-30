package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.LoginFlow;
import com.real_time.chat_app.DTOs.UserRegistration;
import com.real_time.chat_app.Models.User_comp_profile;
import com.real_time.chat_app.Services.AuthService;
import com.real_time.chat_app.enums.RegistrationState;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;


@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody UserRegistration userRegistration){
        RegistrationState registered = authService.createUser(userRegistration );

        if(registered == RegistrationState.UserAlreadyRegistered){
            return ResponseEntity.status(409).body("User Already exists");
        }
        else if(registered == RegistrationState.UserName_Already_Taken){
            return ResponseEntity.status(409).body("Username already taken");
        }

        return ResponseEntity.status(201).body("User Created Successfully");
    }


    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(
            @RequestParam(name = "key") String emailToken,
            HttpServletResponse response
    ) {

        boolean done =
                authService.verifyEmail(
                        emailToken,
                        response
                );

        if (done) {
            return ResponseEntity.ok("Email Verified Successfully");
        }

        return ResponseEntity.status(401).body("Invalid or expired verification token");
    }

    @GetMapping("/send-email")
    public ResponseEntity<?> sendToken(Principal principal){
        authService.sendEmail(principal.getName());
        return ResponseEntity.status(200).body("Token sent successfully");
    }

    @PostMapping("/comp-profile")
    public ResponseEntity<?> completeProfile(Principal principal , HttpServletResponse response
                                             , @RequestBody User_comp_profile userProfile
    ){
        RegistrationState state = authService.completeProfile(response , principal.getName() , userProfile);

        if(state == RegistrationState.Completed){
            return ResponseEntity.status(201).body("User Profile Completed");
        }

        if(state == RegistrationState.UserName_Already_Taken){
            return ResponseEntity.status(409).body("Username already exists");
        }

        return ResponseEntity.internalServerError().body("Internal Server Error");
    }

    @GetMapping("/refresh-token")
    public ResponseEntity<?> refreshAccessToken(HttpServletRequest request , HttpServletResponse response){
        if(authService.refreshAccessToken(request , response))
            return ResponseEntity.status(200).build();

        return ResponseEntity.status(401).build();
    }


    @PostMapping("/logout")
    public void logout(Principal principal , HttpServletResponse response){
        authService.logout(response , principal.getName());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginFlow details , HttpServletResponse response){

        if(authService.login(response , details)){
            return ResponseEntity.status(200).body("Login Successfully");
        }

        return ResponseEntity.status(401).body("Unauthorized");
    }
}
