package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.enums.ScopeVar;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface roomRepo extends MongoRepository<Rooms, String> {
    Optional<Rooms> findByRoomId(String roomId);
    Boolean existsByRoomId(String roomId);
    Page<Rooms> findByScopeVar(ScopeVar scopeVar , Pageable pageable);
}
