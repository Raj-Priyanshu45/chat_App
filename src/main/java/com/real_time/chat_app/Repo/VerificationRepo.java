package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.VerificationTokenFlow;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationRepo extends MongoRepository<VerificationTokenFlow, String> {
    Optional<VerificationTokenFlow> findByUsername(String subject);
}
