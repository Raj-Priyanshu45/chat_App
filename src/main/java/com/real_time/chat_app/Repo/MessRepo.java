package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessRepo extends MongoRepository<Message, String> {

    List<Message> findByRoomId(String roomId);
}
