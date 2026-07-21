package com.real_time.chat_app.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class keyCloakConfig {

    @Bean
    public JwtAuthenticationConverter authenticationConverter(){

        JwtAuthenticationConverter authConverter = new JwtAuthenticationConverter();

        authConverter.setJwtGrantedAuthoritiesConverter(jwt -> {

            List<String> allRoles = new ArrayList<>();

            Map<String , Object> realmAccess = jwt.getClaim("realm_access");

            if(realmAccess == null){
                return Collections.emptyList();
            }

            List<String> roles = (List<String>) realmAccess.get("roles");

            if(roles == null){
                return Collections.emptyList();
            }

            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_"+role.toUpperCase()) )
                    .collect(Collectors.toList());
        });

        return authConverter;
    }
}
