package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.ProfileResponse;
import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final roomRepo roomRepo;
    private final ExtrasRepo extraRepo;
    private final UserRepo userRepo;

    public ProfileResponse retProfileDetails(String userId) {

        Users user = userRepo.findById(userId).orElse(null);

        if (user == null) {
            throw new RuntimeException("Invalid User");
        }

        UserExtras userExtras = extraRepo.findByUserId(user.getId()).orElse(null);

        if (userExtras != null) {

            List<String> friends = userExtras.getFriends()
                    .stream()
                    .map(id -> userRepo.findById(id)
                            .map(Users::getUsername)
                            .orElse(null))
                    .filter(Objects::nonNull)
                    .toList();

            List<String> historyOfRooms = userExtras.getRoomId().stream().toList();

            return new ProfileResponse(
                    user.getUsername(),
                    user.getName(),
                    user.getGmail(),
                    friends,
                    historyOfRooms
            );
        }

        return new ProfileResponse(
                user.getUsername(),
                user.getName(),
                user.getGmail(),
                Collections.emptyList(),
                Collections.emptyList()
        );
    }

    public Map<String, String> usernamesById(List<String> ids) {

        return userRepo.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(
                        Users::getId,
                        Users::getUsername
                ));
    }
}