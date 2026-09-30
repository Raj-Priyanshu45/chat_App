package com.real_time.chat_app.jwt;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class SetCookies {

    @Value("${cookie.secure}")
    private boolean secure;

    @Value("${jwt.expiration}")
    private long expiration;

    public void setTokens(HttpServletResponse response
            , String accessToken
            , String refreshToken){
        ResponseCookie access = ResponseCookie.from("JWT", accessToken)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(Duration.ofMillis(expiration))
                .sameSite("None")
                .build();

        ResponseCookie refresh = ResponseCookie.from("REFRESH", refreshToken)
                .httpOnly(true)
                .secure(secure)
                .path("/auth/")
                .maxAge(Duration.ofDays(7))
                .sameSite("None")
                .build();

        response.addHeader("Set-Cookie", access.toString());
        response.addHeader("Set-Cookie", refresh.toString());
    }

    public void setAccessToken(
            HttpServletResponse response,
            String accessToken
    ) {
        ResponseCookie access = ResponseCookie
                .from("JWT", accessToken)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(Duration.ofMinutes(10))
                .sameSite("Lax")
                .build();

        response.addHeader(
                "Set-Cookie",
                access.toString()
        );
    }
}
