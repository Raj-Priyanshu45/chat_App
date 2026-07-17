package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.Users;
import org.springframework.data.domain.Limit;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepo extends MongoRepository<Users , String> {

    Optional<Users> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<Users> findByKcId(String kcId);

}
