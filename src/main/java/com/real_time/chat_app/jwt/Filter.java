package com.real_time.chat_app.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.security.Security;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

import io.jsonwebtoken.security.Keys;

@Component
public class Filter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String secret;

    private final SecretKey secretKey = Keys.hmacShaKeyFor(
            Base64.getDecoder().decode(secret)
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {


        String token = extractCookies(request , "JWT");

        if(token == null){
            filterChain.doFilter(request , response);
        }

        try{

            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();


            String username = claims.getSubject();
            String role = claims.get("role" , String.class);

             List<GrantedAuthority> grantedAuthority = new ArrayList<>();

             grantedAuthority.add(new SimpleGrantedAuthority("ROLE_"+role));
             grantedAuthority.add(new SimpleGrantedAuthority("STATUS_"+role));

            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    username ,
                    null ,
                    List.of(grantedAuthority)
            );

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
        }

        catch (Exception e){
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired JWT");
        }

        filterChain.doFilter(request , response);
    }

    public String extractCookies(HttpServletRequest request , String name){

        if(request.getCookies() == null){
            return null;
        }

        for(Cookie cookie : request.getCookies()){

            if(name.equals(cookie.getName())){
                return cookie.getValue();
            }
        }

        return null;
    }

    @Override
    protected boolean shouldNotFilter(@SuppressWarnings("null") HttpServletRequest request){

        String path = request.getServletPath();
        return path.startsWith("/auth");
    }

}
