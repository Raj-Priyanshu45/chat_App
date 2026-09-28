package com.real_time.chat_app.Repo;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VerificationRepo extends MongoRepository<VerificationRepo , String> {
}
