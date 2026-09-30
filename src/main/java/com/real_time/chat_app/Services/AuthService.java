package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.LoginFlow;
import com.real_time.chat_app.DTOs.UserRegistration;
import com.real_time.chat_app.Models.*;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.VerificationRepo;
import com.real_time.chat_app.config.SecurityFilter;
import com.real_time.chat_app.enums.*;
import com.real_time.chat_app.jwt.Filter;
import com.real_time.chat_app.jwt.JwtCreation;
import com.real_time.chat_app.jwt.SetCookies;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepo userRepo;
    private final ExtrasRepo extraRepo;
    private final AuthRepo authRepo;
    private final VerificationRepo tokenRepo;
    private final JwtCreation jwtCreation;
    private final SetCookies setCookies;
    private final mailService mailService;
    private final Filter filter;

    public RegistrationState createUser(UserRegistration userRegistration , HttpServletResponse response) {

        String hashedPassword = passwordEncoder.encode(userRegistration.password());

        Users user = Users.builder()
                .username(userRegistration.username())
                .state(AccountState.ACTIVE)
                .role(Role.USER)
                .name(userRegistration.name())
                .gmail(userRegistration.gmail())
                .build();

        userRepo.save(user);

        extraRepo.save(
                UserExtras.builder()
                        .userId(user.getId())
                        .build()
        );

        authRepo.save(
                UserAuth.builder()
                        .userId(user.getId())
                        .password(hashedPassword)
                        .provider(Provider.App)
                        .createdAt(LocalDateTime.now())
                        .emailState(EmailVerificationState.Not_Verified)
                        .build()
        );


        log.info("User created with {} and {}" , userRegistration.username() , userRegistration.gmail());
        return RegistrationState.Completed;
    }

    public boolean verifyEmail(String emailToken, HttpServletResponse response, String subject) {

        VerificationTokenFlow token = tokenRepo.findByUsername(subject).orElse(null);

        if(token == null){
            log.warn("Invalid request from user {}",subject);
            throw new RuntimeException("token not assigned");
        }

        if(emailToken.equals(token.getToken())
                && token.getExpirationTime().isBefore(LocalDateTime.now())){

            Users users = userRepo.findByUsername(subject).orElse(null);

            if(users == null) throw  new RuntimeException("Internal Issue");

            UserAuth userAuth = authRepo.findByUserId(users.getId()).orElse(null);

            if(userAuth == null) throw new RuntimeException("Internal Issue");

            userAuth.setEmailState(EmailVerificationState.Verified);


            String refreshToken = jwtCreation.rawRefreshToken();

            String hashRefreshToken = jwtCreation.hashRefreshToken(refreshToken);

            userAuth.setHashedRefreshToken(hashRefreshToken);
            authRepo.save(userAuth);

            String accessToken = jwtCreation.generateAccessToken(users);

            setCookies.setTokens(response , accessToken , refreshToken);

            return true;
        }

        return false;
    }

    public void senEmail(String username){
        Users users = userRepo.findByUsername(username).orElse(null);

        if(users == null) throw  new RuntimeException("User not found");

        String email = users.getGmail();

        mailService.sendVerificationEmail(email , UUID.randomUUID().toString());

    }

    public RegistrationState completeProfile(HttpServletResponse response, String subject, User_comp_profile userProfile) {

        Users users = userRepo.findByUsername(subject).orElse(null);

        if(users == null){
            log.warn("Unauthorized attempt");
            throw new RuntimeException("User does not exists");
        }

        if(userRepo.existsByUsername(userProfile.username())){
            return RegistrationState.UserName_Already_Taken;
        }

        UserAuth userAuth = authRepo.findByUserId(users.getId()).orElse(null);

        if(userAuth == null) throw new RuntimeException("Internal Issue");

        users.setName(userProfile.name());
        users.setUsername(userProfile.username());
        userRepo.save(users);

        String accessToken = jwtCreation.generateAccessToken(users);
        String refreshToken = jwtCreation.rawRefreshToken();
        String hashRefreshToken = jwtCreation.hashRefreshToken(refreshToken);

        userAuth.setHashedRefreshToken(hashRefreshToken);
        authRepo.save(userAuth);

        setCookies.setTokens(response , accessToken , refreshToken);

        return RegistrationState.Completed;
    }

    public boolean refreshAccessToken(HttpServletRequest request, HttpServletResponse response) {

        String rawRefresh = filter.extractCookies(request , "REFRESH");

        if (rawRefresh == null){
            log.warn("Unauthorized attempt in refresh token");
            return false;
        }

        String hashed = jwtCreation.hashRefreshToken(rawRefresh);

        UserAuth userAuth = authRepo.findByHashedRefreshToken(hashed).orElse(null);

        if(userAuth == null){
            log.warn("Invalid Refresh token detected");
            return false;
        }

        Users user = userRepo.findById(userAuth.getId()).orElse(null);
        if(user == null) throw new RuntimeException("Internal server error");

        String accessToken = jwtCreation.generateAccessToken(user);
        String refreshToken = jwtCreation.rawRefreshToken();
        String hashToken = jwtCreation.hashRefreshToken(refreshToken);

        setCookies.setTokens(response , accessToken , refreshToken);

        return true;
    }

    public void logout(HttpServletResponse response , String username){

        Users user = userRepo.findByUsername(username).orElse(null);

        if(user == null){
            throw new RuntimeException("User not found");
        }

        UserAuth userAuth = authRepo.findByUserId(user.getId()).orElse(null);

        if(userAuth == null){
            throw new RuntimeException("Internal error");
        }

        userAuth.setHashedRefreshToken(null);
        authRepo.save(userAuth);

        setCookies.setTokens(response , null , null);
    }

    public boolean login(HttpServletResponse response , LoginFlow details) {

        Users user = userRepo.findByUsername(details.username()).orElse(null);

        if(user == null){
            log.info("User not found with username {}",details.username());
            return false;
        }

        UserAuth userAuth = authRepo.findByUserId(user.getId()).orElse(null);

        if(userAuth == null) return false;


        if (!passwordEncoder.matches(
                details.password(),
                userAuth.getPassword()
        )) {
            log.warn("Invalid creds");
            return false;
        }

        String accessToken = jwtCreation.generateAccessToken(user);
        String refreshToken = jwtCreation.rawRefreshToken();
        String hashToken = jwtCreation.hashRefreshToken(refreshToken);

        userAuth.setHashedRefreshToken(hashToken);
        authRepo.save(userAuth);

        setCookies.setTokens(response , accessToken , refreshToken);
        return true;
    }
}
