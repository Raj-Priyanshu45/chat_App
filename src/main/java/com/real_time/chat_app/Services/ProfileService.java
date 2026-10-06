package com.real_time.chat_app.Services;

import com.real_time.chat_app.DTOs.ProfileResponse;
import com.real_time.chat_app.DTOs.UserBrief;
import com.real_time.chat_app.DTOs.UserProfileResponse;
import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import com.real_time.chat_app.Repo.roomRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
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

            List<String> friends = new ArrayList<>(userExtras.getFriends());

            List<String> historyOfRooms = userExtras.getRoomId().stream().toList();

            return new ProfileResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getName(),
                    user.getGmail(),
                    userExtras.getImageUri(),
                    friends,
                    historyOfRooms
            );
        }

        return new ProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getGmail(),
                null,
                Collections.emptyList(),
                Collections.emptyList()
        );
    }

    public Map<String, String> usernamesById(List<String> ids) {

        return userRepo.findAllById(ids.stream().limit(100).toList())
                .stream()
                .filter(u -> u.getUsername() != null)
                .collect(Collectors.toMap(
                        Users::getId,
                        Users::getUsername
                ));
    }

    public Map<String, UserBrief> briefsById(List<String> ids) {

        List<String> limited = ids.stream().limit(100).toList();

        Map<String, String> images = extraRepo.findByUserIdIn(limited).stream()
                .filter(e -> e.getImageUri() != null)
                .collect(Collectors.toMap(UserExtras::getUserId, UserExtras::getImageUri, (a, b) -> a));

        return userRepo.findAllById(limited).stream()
                .filter(u -> u.getUsername() != null)
                .collect(Collectors.toMap(
                        Users::getId,
                        u -> new UserBrief(u.getUsername(), images.get(u.getId()))
                ));
    }

    public UserProfileResponse getUserProfile(String userId) {

        Users user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserExtras extras = extraRepo.findByUserId(userId).orElseThrow(
                () -> new RuntimeException("Internal Server Error")
        );

        return new UserProfileResponse(
                user.getUsername(),
                user.getName(),
                extras.getImageUri()
        );
    }
}