package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.VerificationTokenFlow;
import com.real_time.chat_app.enums.TokenType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationRepo extends MongoRepository<VerificationTokenFlow, String> {
    void deleteByUserId(String userId);
    Optional<VerificationTokenFlow> findByTokenAndType(String token, TokenType type);
    void deleteByUserIdAndType(String userId, TokenType type);
}
