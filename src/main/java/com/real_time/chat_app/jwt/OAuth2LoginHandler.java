package com.real_time.chat_app.jwt;

import com.real_time.chat_app.Models.UserAuth;
import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.enums.AccountState;
import com.real_time.chat_app.enums.EmailVerificationState;
import com.real_time.chat_app.enums.Provider;
import com.real_time.chat_app.enums.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
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
    private final ExtrasRepo extrasRepo;

    @Value("${app.frontend-url}")
    private String frontEnd;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User user = (OAuth2User) authentication.getPrincipal();

        OAuth2AuthenticationToken oauthToken =
                (OAuth2AuthenticationToken) authentication;

        String provider =
                oauthToken.getAuthorizedClientRegistrationId();

        Provider authProvider =
                provider.equals("google")
                        ? Provider.Google
                        : Provider.Github;

        String email = user.getAttribute("email");

        if (email == null || email.isBlank()) {
            response.sendRedirect(
                    frontEnd + "/login?error=email_unavailable"
            );
            return;
        }

        Users newUser = userRepo.findByGmail(email).orElse(null);

        if (newUser == null) {

            newUser = Users.builder()
                    .gmail(email)
                    .name(null)
                    .role(Role.USER)
                    .username(UUID.randomUUID().toString())
                    .state(AccountState.INCOMPLETE)
                    .build();

            userRepo.save(newUser);

            extrasRepo.save(
                    UserExtras.builder()
                            .userId(newUser.getId())
                            .build()
            );

            authRepo.save(
                    UserAuth.builder()
                            .createdAt(LocalDateTime.now())
                            .provider(authProvider)
                            .password(null)
                            .emailState(EmailVerificationState.Verified)
                            .userId(newUser.getId())
                            .build()
            );

            String incompleteToken =
                    jwtCreation.generateIncompleteToken(newUser);

            setCookies.setAccessToken(
                    response,
                    incompleteToken
            );

            response.sendRedirect(
                    frontEnd + "/complete-profile"
            );

            return;
        }

        UserAuth userAuth = authRepo.findByUserId(newUser.getId()).orElseThrow(() ->
                 new RuntimeException("Internal Server Error"));

        if (newUser.getState() == AccountState.INCOMPLETE) {

            String incompleteToken =
                    jwtCreation.generateIncompleteToken(newUser);

            setCookies.setAccessToken(
                    response,
                    incompleteToken
            );

            response.sendRedirect(
                    frontEnd + "/complete-profile"
            );
            return;
        }

        String accessToken =
                jwtCreation.generateAccessToken(newUser);

        String refreshToken =
                jwtCreation.rawRefreshToken();

        String hashedRefreshToken =
                jwtCreation.hashRefreshToken(refreshToken);


        userAuth.setHashedRefreshToken(hashedRefreshToken);
        authRepo.save(userAuth);

        setCookies.setTokens(
                response,
                accessToken,
                refreshToken
        );

        response.sendRedirect(
                frontEnd + "/home"
        );
    }

}