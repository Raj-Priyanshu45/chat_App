package com.real_time.chat_app.Repo;

import com.real_time.chat_app.Models.RoomMember;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MemberRepo extends MongoRepository<RoomMember , String> {

    boolean existsByRoomIdAndUserId(String roomId, String userId);

    Optional<RoomMember> findByUserIdAndRoomId(String userId , String roomId);

    List<RoomMember> findByRoomIdAndLeftAtIsNull(String roomId);

    boolean existsByRoomIdAndUserIdAndLeftAtIsNull(String roomId , String userId);
}
