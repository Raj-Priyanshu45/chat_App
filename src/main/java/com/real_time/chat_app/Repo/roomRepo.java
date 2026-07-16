package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.Rooms;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface roomRepo extends MongoRepository<Rooms, String> {
    Optional<Rooms> findByRoomId(String roomId);
}
