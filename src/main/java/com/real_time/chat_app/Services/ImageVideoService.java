package com.real_time.chat_app.Services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.enums.Content_Type;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ImageVideoService {

    private final MessRepo messRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final roomRepo roomRepo;
    private final Cloudinary cloudinary;


    private static final Set<String> extensions =
            Set.of("jpg", "jpeg", "gif", "png", "webp", "bmp");

    private static final long maxImageSize =
            5 * 1024 * 1024L;

    private static final Set<String> MIME_TYPES =
            Set.of(
                    "image/jpeg",
                    "image/png",
                    "image/gif",
                    "image/webp",
                    "image/bmp"
            );


    private static final Set<String> videoExtensions =
            Set.of(
                    "mp4",
                    "webm",
                    "mov",
                    "mkv",
                    "avi",
                    "mpeg",
                    "3gp",
                    "m4v"
            );

    private static final long maxVideoSize =
            20 * 1024 * 1024L;

    private static final Set<String> VIDEO_TYPES =
            Set.of(
                    "video/mp4",
                    "video/webm",
                    "video/quicktime",
                    "video/x-msvideo",
                    "video/x-matroska",
                    "video/mpeg",
                    "video/3gpp",
                    "video/x-m4v"
            );


    private static final long maxAudioSize =
            10 * 1024 * 1024L;

    private static final Set<String> AUDIO_EXTENSIONS =
            Set.of(
                    "mp3",
                    "wav",
                    "ogg",
                    "m4a",
                    "aac",
                    "opus"
            );

    private static final Set<String> AUDIO_TYPES =
            Set.of(
                    "audio/mpeg",
                    "audio/wav",
                    "audio/ogg",
                    "audio/mp4",
                    "audio/aac",
                    "audio/flac",
                    "audio/opus",
                    "audio/amr"
            );


    public List<Message> uploadFiles(
            MultipartFile[] files,
            String sender,
            String roomId
    ) throws IOException {

        List<Message> saved = new ArrayList<>();

        Rooms room = roomRepo
                .findByRoomId(roomId)
                .orElse(null);

        if (room == null) {
            throw new RuntimeException("Room not found");
        }

        for (MultipartFile file : files) {
            saved.add(
                    checkAndUpload(
                            file,
                            sender,
                            room
                    )
            );
        }

        return saved;
    }


    private Message checkAndUpload(
            MultipartFile file,
            String sender,
            Rooms room
    ) throws IOException {

        if (file.isEmpty()) {
            throw new RuntimeException("File Not Found");
        }

        String filename =
                file.getOriginalFilename();

        if (filename == null || filename.isBlank()) {
            throw new RuntimeException("File Missing");
        }

        String contentType =
                file.getContentType();

        if (contentType == null) {
            throw new RuntimeException(
                    "Invalid Content type"
            );
        }

        String extension =
                getExtensions(filename);

        long size =
                file.getSize();


        // IMAGE
        if (MIME_TYPES.contains(contentType)) {

            if (!extensions.contains(extension)) {
                throw new RuntimeException(
                        "Invalid extensions"
                );
            }

            if (size > maxImageSize) {
                throw new RuntimeException(
                        "File too large"
                );
            }

            return saveFile(
                    file,
                    extension,
                    room,
                    sender,
                    Content_Type.IMAGE
            );
        }


        // VIDEO
        else if (VIDEO_TYPES.contains(contentType)) {

            if (!videoExtensions.contains(extension)) {
                throw new RuntimeException(
                        "Invalid extensions"
                );
            }

            if (size > maxVideoSize) {
                throw new RuntimeException(
                        "File too large"
                );
            }

            return saveFile(
                    file,
                    extension,
                    room,
                    sender,
                    Content_Type.VIDEO
            );
        }


        // AUDIO
        else if (AUDIO_TYPES.contains(contentType)) {

            if (!AUDIO_EXTENSIONS.contains(extension)) {
                throw new RuntimeException(
                        "Invalid extensions"
                );
            }

            if (size > maxAudioSize) {
                throw new RuntimeException(
                        "File too large"
                );
            }

            return saveFile(
                    file,
                    extension,
                    room,
                    sender,
                    Content_Type.AUDIO
            );
        }


        else {
            throw new RuntimeException(
                    "Invalid Content type"
            );
        }
    }


    private Message saveFile(
            MultipartFile file,
            String extension,
            Rooms room,
            String sender,
            Content_Type type
    ) throws IOException {

        /*
         * Generate a unique Cloudinary public ID.
         */
        String publicId =
                UUID.randomUUID().toString();


        /*
         * Decide Cloudinary resource type.
         */
        String resourceType;

        if (type == Content_Type.IMAGE) {

            resourceType = "image";

        } else if (type == Content_Type.VIDEO) {

            resourceType = "video";

        } else {

            resourceType = "raw";
        }


        /*
         * Cloudinary upload parameters.
         */
        Map<String, Object> uploadParams =
                ObjectUtils.asMap(
                        "resource_type",
                        resourceType,

                        "folder",
                        "chat-app/" +
                                type.name().toLowerCase(),

                        "public_id",
                        publicId
                );


        /*
         * Upload to Cloudinary.
         */
        Map<?, ?> uploadResult =
                cloudinary
                        .uploader()
                        .upload(
                                file.getBytes(),
                                uploadParams
                        );


        /*
         * Get HTTPS URL returned by Cloudinary.
         */
        String fileUrl =
                (String) uploadResult.get(
                        "secure_url"
                );


        if (fileUrl == null ||
                fileUrl.isBlank()) {

            throw new RuntimeException(
                    "Cloudinary upload failed"
            );
        }


        /*
         * Store Cloudinary URL in MongoDB.
         */
        Message saved =
                messRepo.save(
                        new Message(
                                room.getRoomId(),
                                sender,
                                fileUrl,
                                type
                        )
                );


        /*
         * Broadcast message to room.
         */
        messagingTemplate.convertAndSend(
                "/topic/room/" +
                        room.getRoomId(),
                saved
        );


        return saved;
    }


    private String getExtensions(
            String filename
    ) {

        boolean flag = false;

        StringBuilder sb =
                new StringBuilder();

        for (
                int i = filename.length() - 1;
                i > 0;
                i--
        ) {

            if (filename.charAt(i) == '.') {

                flag = true;
                break;
            }

            sb.append(
                    filename.charAt(i)
            );
        }

        if (!flag) {
            throw new RuntimeException(
                    "Invalid extensions"
            );
        }

        return sb
                .reverse()
                .toString()
                .toLowerCase();
    }
}