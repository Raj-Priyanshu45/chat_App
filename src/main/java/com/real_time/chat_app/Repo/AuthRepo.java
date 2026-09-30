package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.UserAuth;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


import java.util.Optional;


@Repository
public interface
AuthRepo extends MongoRepository<UserAuth , String> {
    Optional<UserAuth> findByUserId(String id);
    Optional<UserAuth> findByHashedRefreshToken(String token);
}
