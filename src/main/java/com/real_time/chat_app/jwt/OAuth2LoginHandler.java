package com.real_time.chat_app.jwt;

import com.real_time.chat_app.Models.UserAuth;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.enums.AccountState;
import com.real_time.chat_app.enums.EmailVerificationState;
import com.real_time.chat_app.enums.Provider;
import com.real_time.chat_app.enums.Role;
import io.jsonwebtoken.Jwt;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;


import java.io.IOException;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2LoginHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtCreation jwtCreation;
    private final SetCookies setCookies;
    private final UserRepo userRepo;
    private final AuthRepo authRepo;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request ,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User user = (OAuth2User) authentication.getPrincipal();



        String email = user.getAttribute("email");
        String provider = authentication
                .getAuthorities()
                .toString()
                .contains("github")
                ? "GITHUB" : "GOOGLE";

        Users newUser = userRepo.findByGmail(email).orElse(null);

        if(newUser == null){
            newUser = Users.builder()
                    .gmail(email)
                    .name(null)
                    .role(Role.USER)
                    .username(UUID.randomUUID().toString())
                    .state(AccountState.INCOMPLETE)
                    .build();
            userRepo.save(newUser);

            authRepo.save(
                    UserAuth.builder()
                            .createdAt(LocalDateTime.now())
                            .provider(provider.equals("GOOGLE") ? Provider.Google : Provider.Github)
                            .password(null)
                            .emailState(EmailVerificationState.Verified)
                            .userId(newUser.getId())
                            .build()
            );

            String accessToken = jwtCreation.generateAccessToken(newUser);
            setCookies.setTokens(response , accessToken , null);

            return;
        }

        String accessToken = jwtCreation.generateAccessToken(newUser);

        String refreshToken = jwtCreation.rawRefreshToken();
        String hashedRefreshToken = jwtCreation.hashRefreshToken(refreshToken);

        authRepo.save(
                UserAuth.builder()
                        .hashedRefreshToken(hashedRefreshToken)
                        .build()
        );

        setCookies.setTokens(response, accessToken, refreshToken);
    }
}
