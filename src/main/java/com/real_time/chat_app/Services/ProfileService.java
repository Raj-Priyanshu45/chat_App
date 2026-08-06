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

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final roomRepo roomRepo;
    private final ExtrasRepo extraRepo;
    private final UserRepo userRepo;

    public ProfileResponse retProfileDetails(String username){

        Users user = userRepo.findByUsername(username).orElse(null);

        if(user == null){
            throw new RuntimeException("Invalid User");
        }

        UserExtras userExtras = extraRepo.findByUsername(username).orElse(null);

        if(userExtras != null){

            List<String> friends = userExtras.getFriends().stream().toList();

            List<String> historyOfRooms = userExtras.getRoomId().stream().toList();

            return new ProfileResponse(user.getKcId() ,
                    user.getUsername() ,
                    user.getName() ,
                    user.getGmail() ,
                    friends ,
                    historyOfRooms
                    );
        }

        return new ProfileResponse(user.getKcId() ,
                user.getUsername() ,
                user.getName() ,
                user.getGmail() , Collections.emptyList() , Collections.emptyList());
    }
}
