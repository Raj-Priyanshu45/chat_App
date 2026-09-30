package com.real_time.chat_app.jwt;

import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.UserAuth;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.enums.EmailVerificationState;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static com.real_time.chat_app.enums.EmailVerificationState.Not_Verified;

@Component
@RequiredArgsConstructor
public class JwtCreation {


    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expTime;

    private final AuthRepo authRepo;

    private SecretKey secretKey;

    @PostConstruct void init(){
        secretKey = Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret));
    }

    public String generateAccessToken(Users users){

        UserAuth userAuth = authRepo.findByUserId(users.getId()).orElse(null);

        if(userAuth == null) throw new RuntimeException("Error generating Tokens");

        long exp = (userAuth.getEmailState() == Not_Verified) ? 600000 : expTime;


        return Jwts.builder()
                .subject(users.getId())
                .claim("role" , users.getRole().name())
                .claim("state" , users.getState().name())
                .claim("email_verified" , userAuth.getEmailState())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + exp))
                .signWith(secretKey)
                .compact();

    }

    public String rawRefreshToken(){
        return UUID.randomUUID().toString()+UUID.randomUUID();
    }

    public String hashRefreshToken(String rawToken){

        if(rawToken == null) throw  new IllegalArgumentException("rawToken cannot be null");

        try{
            byte[] hash = MessageDigest
                    .getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));

            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public String generateIncompleteToken(Users users) {

        return Jwts.builder()
                .subject(users.getId())
                .claim("role", users.getRole().name())
                .claim("state", users.getState().name())
                .claim("onboarding", true)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + 10 * 60 * 1000L
                        )
                )
                .signWith(secretKey)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }


}
