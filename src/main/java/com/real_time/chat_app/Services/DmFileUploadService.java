package com.real_time.chat_app.Services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Models.Rooms;
import com.real_time.chat_app.Repo.MessRepo;
import com.real_time.chat_app.Repo.roomRepo;
import com.real_time.chat_app.config.CloudinaryConfig;
import com.real_time.chat_app.enums.Content_Type;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DmFileUploadService {

    private final MessRepo messRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final roomRepo roomRepo;
    private final Cloudinary cloudinary;


    @Value("${storage.path}")
    private String uploadPath;

    private final static Set<String> extensions = Set.of("jpg", "jpeg", "gif", "png");
    private final static long maxImageSize = 5 * 1024 * 1024L;
    private static final Set<String> MIME_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/bmp"
    );

    private final static Set<String> videoExtensions = Set.of(
            "mp4", "webm", "mov", "mkv", "avi", "mpeg", "3gp", "m4v"
    );
    private final static long maxVideoSize = 20 * 1024 * 1024L;
    private static final Set<String> VIDEO_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
            "video/x-matroska", "video/mpeg", "video/3gpp", "video/x-m4v"
    );

    private static final long maxAudioSize = 10 * 1024 * 1024L;
    private static final Set<String> AUDIO_EXTENSIONS = Set.of(
            "mp3", "wav", "ogg", "m4a", "aac", "opus"
    );
    private static final Set<String> AUDIO_TYPES = Set.of(
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
            "audio/aac", "audio/flac", "audio/opus", "audio/amr"
    );

    public List<Message> uploadFiles(MultipartFile[] files, String sender, String rec) throws IOException {

        List<Message> saved = new ArrayList<>();


        for (MultipartFile file : files) {
            saved.add(checkAndUpload(file, sender, rec));
        }
        return saved;
    }

    private Message checkAndUpload(MultipartFile file, String sender, String rec) throws IOException {

        if (file.isEmpty()) throw new RuntimeException("File Not Found");

        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) throw new RuntimeException("File Missing");

        String contentType = file.getContentType();
        if (contentType == null) throw new RuntimeException("Invalid Content type");

        String extension = getExtensions(filename);
        long size = file.getSize();

        if (MIME_TYPES.contains(contentType)) {

            if (!extensions.contains(extension)) throw new RuntimeException("Invalid extensions");
            if (size > maxImageSize) throw new RuntimeException("File to large");

            return saveFile(file, extension, rec, sender, Content_Type.IMAGE);

        } else if (VIDEO_TYPES.contains(contentType)) {

            if (!videoExtensions.contains(extension)) throw new RuntimeException("Invalid extensions");
            if (size > maxVideoSize) throw new RuntimeException("File to large");

            return saveFile(file, extension, rec, sender, Content_Type.VIDEO);

        } else if (AUDIO_TYPES.contains(contentType)) {

            if (!AUDIO_EXTENSIONS.contains(extension)) throw new RuntimeException("Invalid extensions");
            if (size > maxAudioSize) throw new RuntimeException("File to large");

            return saveFile(file, extension, rec, sender, Content_Type.AUDIO);

        } else {
            throw new RuntimeException("Invalid Content type");
        }
    }

    private Message saveFile(
            MultipartFile file,
            String extension,
            String rec,
            String sender,
            Content_Type type
    ) throws IOException {

        String roomId = getDmRoomId(sender, rec);

        boolean flag = roomRepo.existsByRoomId(roomId);

        if (!flag) {
            throw new RuntimeException("Internal Server error");
        }

        String publicId = UUID.randomUUID().toString();

        String resourceType;

        if (type == Content_Type.IMAGE) {
            resourceType = "image";
        } else if (type == Content_Type.VIDEO) {
            resourceType = "video";
        } else {
            resourceType = "raw";
        }

        Map<String, Object> uploadParams = ObjectUtils.asMap(
                "resource_type", resourceType,
                "public_id", publicId,
                "folder", "chat-app/" + type.name().toLowerCase()
        );

        Map<?, ?> uploadResult = cloudinary.uploader().upload(
                file.getBytes(),
                uploadParams
        );

        String fileUrl = (String) uploadResult.get("secure_url");

        if (fileUrl == null || fileUrl.isBlank()) {
            throw new RuntimeException("Cloudinary upload failed");
        }

        Message saved = messRepo.save(
                new Message(
                        roomId,
                        sender,
                        fileUrl,
                        type
                )
        );

        messagingTemplate.convertAndSendToUser(
                sender,
                "/queue/dm",
                saved
        );

        messagingTemplate.convertAndSendToUser(
                rec,
                "/queue/dm",
                saved
        );

        return saved;
    }

    private String getExtensions(String filename) {

        boolean flag = false;
        StringBuilder sb = new StringBuilder();

        for (int i = filename.length() - 1; i > 0; i--) {

            if (filename.charAt(i) == '.') {
                flag = true;
                break;
            }

            sb.append(filename.charAt(i));
        }

        if (!flag) throw new RuntimeException("Invalid extensions");

        return sb.reverse().toString().toLowerCase();
    }


    private String getDmRoomId(String sender , String rec){
        return sender.compareTo(rec) < 0 ? sender + rec : rec + sender;
    }
}