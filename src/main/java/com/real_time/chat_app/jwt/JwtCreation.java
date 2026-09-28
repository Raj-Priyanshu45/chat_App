package com.real_time.chat_app.jwt;

import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Users;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtCreation {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expTime;

    private final SecretKey secretKey = Keys.hmacShaKeyFor(
            Base64.getDecoder().decode(secret)
    );

    public String generateAccessToken(Users users){

        return Jwts.builder()
                .subject(users.getUsername())
                .claim("role" , users.getRole().name())
                .claim("state" , users.getState().name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expTime))
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
}
