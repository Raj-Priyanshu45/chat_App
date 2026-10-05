package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.LoginFlow;
import com.real_time.chat_app.DTOs.UserRegistration;
import com.real_time.chat_app.Models.*;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.VerificationRepo;
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

import java.security.SecureRandom;
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

    public RegistrationState createUser(UserRegistration userRegistration) {

        if (userRepo.existsByGmail(userRegistration.gmail())) {
            return RegistrationState.UserAlreadyRegistered;
        }

        if (userRepo.existsByUsername(userRegistration.username())) {
            return RegistrationState.UserName_Already_Taken;
        }

        String hashedPassword =
                passwordEncoder.encode(userRegistration.password());

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

        String token = UUID.randomUUID().toString();

        tokenRepo.deleteByUserId(user.getId());

        tokenRepo.save(
                VerificationTokenFlow.builder()
                        .userId(user.getId())
                        .email(user.getGmail())
                        .token(token)
                        .type(TokenType.EMAIL_VERIFICATION)
                        .expirationTime(
                                LocalDateTime.now().plusMinutes(15)
                        )
                        .build()
        );

        mailService.sendVerificationEmail(
                user.getGmail(),
                token
        );

        log.info(
                "User created with {} and {}",
                userRegistration.username(),
                userRegistration.gmail()
        );

        return RegistrationState.Completed;
    }

    public boolean verifyEmail(
            String emailToken,
            HttpServletResponse response
    ) {

        VerificationTokenFlow token =
                tokenRepo.findByTokenAndType(emailToken, TokenType.EMAIL_VERIFICATION).orElse(null);

        if (token == null) {
            return false;
        }

        if (!token.getExpirationTime()
                .isAfter(LocalDateTime.now())) {
            return false;
        }

        Users users =
                userRepo.findById(token.getUserId()).orElse(null);

        if (users == null) {
            throw new RuntimeException("Internal Issue");
        }

        UserAuth userAuth =
                authRepo.findByUserId(users.getId()).orElse(null);

        if (userAuth == null) {
            throw new RuntimeException("Internal Issue");
        }

        userAuth.setEmailState(
                EmailVerificationState.Verified
        );

        String refreshToken =
                jwtCreation.rawRefreshToken();

        String hashRefreshToken =
                jwtCreation.hashRefreshToken(refreshToken);

        userAuth.setHashedRefreshToken(hashRefreshToken);

        authRepo.save(userAuth);

        String accessToken =
                jwtCreation.generateAccessToken(users);

        setCookies.setTokens(
                response,
                accessToken,
                refreshToken
        );

        tokenRepo.delete(token);

        return true;
    }

    public void sendEmail(String userId) {

        Users users =
                userRepo.findById(userId).orElse(null);

        if (users == null) {
            throw new RuntimeException("User not found");
        }

        String token = generateToken();

        tokenRepo.deleteByUserId(userId);

        VerificationTokenFlow tokenFlow =
                VerificationTokenFlow.builder()
                        .userId(userId)
                        .email(users.getGmail())
                        .token(token)
                        .type(TokenType.EMAIL_VERIFICATION)
                        .expirationTime(
                                LocalDateTime.now().plusMinutes(15)
                        )
                        .build();

        tokenRepo.save(tokenFlow);

        mailService.sendVerificationEmail(
                users.getGmail(),
                token
        );
    }

    public RegistrationState completeProfile(HttpServletResponse response, String subject, User_comp_profile userProfile) {

        Users users = userRepo.findById(subject).orElse(null);

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
        users.setState(AccountState.ACTIVE);
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

        Users user = userRepo.findById(userAuth.getUserId()).orElse(null);
        if(user == null) throw new RuntimeException("Internal server error");

        String accessToken = jwtCreation.generateAccessToken(user);
        String refreshToken = jwtCreation.rawRefreshToken();
        String hashToken = jwtCreation.hashRefreshToken(refreshToken);

        userAuth.setHashedRefreshToken(hashToken);
        authRepo.save(userAuth);

        setCookies.setTokens(response , accessToken , refreshToken);

        return true;
    }

    public void logout(HttpServletResponse response, String userId) {

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) {
            throw new RuntimeException("User not found");
        }

        UserAuth userAuth = authRepo.findByUserId(user.getId()).orElse(null);

        if (userAuth == null) {
            throw new RuntimeException("Internal error");
        }

        userAuth.setHashedRefreshToken(null);
        authRepo.save(userAuth);

        setCookies.clearTokens(response);
    }

    public boolean login(HttpServletResponse response , LoginFlow details) {

        Users user = userRepo.findByUsernameOrGmail(details.username() , details.username()).orElse(null);

        if(user == null){
            log.info("User not found with username {}",details.username());
            return false;
        }

        UserAuth userAuth = authRepo.findByUserId(user.getId()).orElse(null);

        if(userAuth == null) return false;

        if (userAuth.getEmailState() != EmailVerificationState.Verified) {
            return false;
        }

        if (userAuth.getPassword() == null) {
            return false;
        }

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


    public void forgotPassword(String gmail) {

        if (gmail == null || gmail.isBlank()) return;

        Users user = userRepo.findByGmail(gmail.trim()).orElse(null);
        if (user == null) return;                       // silent: don't reveal who is registered

        UserAuth userAuth = authRepo.findByUserId(user.getId()).orElse(null);
        if (userAuth == null || userAuth.getPassword() == null) return;  // Google/GitHub-only account

        String rawToken = generateToken();

        tokenRepo.deleteByUserIdAndType(user.getId(), TokenType.PASSWORD_RESET);

        tokenRepo.save(
                VerificationTokenFlow.builder()
                        .userId(user.getId())
                        .email(user.getGmail())
                        .token(jwtCreation.hashRefreshToken(rawToken))   // SHA-256, same helper you already have
                        .type(TokenType.PASSWORD_RESET)
                        .expirationTime(LocalDateTime.now().plusMinutes(15))
                        .build()
        );

        try {
            mailService.sendPasswordResetEmail(user.getGmail(), rawToken);
        } catch (Exception e) {
            log.error("Could not send reset email", e);   // never surface this to the caller
        }
    }

    public boolean resetPassword(String rawToken, String newPassword) {

        if (rawToken == null || rawToken.isBlank()) return false;

        VerificationTokenFlow token = tokenRepo
                .findByTokenAndType(jwtCreation.hashRefreshToken(rawToken.trim()), TokenType.PASSWORD_RESET)
                .orElse(null);

        if (token == null || !token.getExpirationTime().isAfter(LocalDateTime.now())) return false;

        UserAuth userAuth = authRepo.findByUserId(token.getUserId()).orElse(null);
        if (userAuth == null) return false;

        userAuth.setPassword(passwordEncoder.encode(newPassword));
        userAuth.setHashedRefreshToken(null);
        userAuth.setEmailState(EmailVerificationState.Verified);
        authRepo.save(userAuth);

        tokenRepo.delete(token);
        return true;
    }



    private String generateToken(){
        SecureRandom random = new SecureRandom();
        return 100000 + random.nextInt(900000)+"";
    }
}
