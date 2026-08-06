package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.UserExtras;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExtrasRepo extends MongoRepository<UserExtras , String> {

    Optional<UserExtras> findByUsername(String username);
}
