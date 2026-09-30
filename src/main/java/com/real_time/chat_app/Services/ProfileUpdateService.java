package com.real_time.chat_app.Services;

import com.real_time.chat_app.Models.UserExtras;
import com.real_time.chat_app.Models.Users;
import com.real_time.chat_app.Repo.AuthRepo;
import com.real_time.chat_app.Repo.ExtrasRepo;
import com.real_time.chat_app.Repo.UserRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileUpdateService {

    private final UserRepo userRepo;
    private final ExtrasRepo extraRepo;
    private final AuthRepo authRepo;
    private final Cloudinary cloudinary;
    private final ImageVideoService imageService;


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

    public boolean updateImage(String subject, MultipartFile file) {

        Users user = userRepo.findByUsername(subject).orElse(null);

        if (user == null) {
            log.warn("Unauthorized user changing profile");
            return false;
        }

        UserExtras extras = extraRepo.findByUserId(user.getId()).orElse(null);

        if (extras == null) {
            throw new RuntimeException("Internal server error");
        }

        try {

            if (file.isEmpty()) {
                throw new RuntimeException("File Not Found");
            }

            String filename = file.getOriginalFilename();

            if (filename == null || filename.isBlank()) {
                throw new RuntimeException("File Missing");
            }

            String contentType = file.getContentType();

            if (contentType == null) {
                throw new RuntimeException("Invalid Content type");
            }

            String extension = imageService.getExtensions(filename);
            long size = file.getSize();

            // Image validation
            if (!MIME_TYPES.contains(contentType)) {
                throw new RuntimeException("Invalid Content type");
            }

            if (!extensions.contains(extension)) {
                throw new RuntimeException("Invalid extension");
            }

            if (size > maxImageSize) {
                throw new RuntimeException("File too large");
            }

            // Cloudinary upload
            String publicId = UUID.randomUUID().toString();

            Map<String, Object> uploadParams =
                    ObjectUtils.asMap(
                            "resource_type", "image",
                            "folder", "chat-app/profile",
                            "public_id", publicId
                    );

            Map<?, ?> uploadResult =
                    cloudinary
                            .uploader()
                            .upload(
                                    file.getBytes(),
                                    uploadParams
                            );

            String fileUrl =
                    (String) uploadResult.get("secure_url");

            if (fileUrl == null || fileUrl.isBlank()) {
                throw new RuntimeException("Cloudinary upload failed");
            }

            extras.setImageUri(fileUrl);
            extraRepo.save(extras);

            return true;

        } catch (IOException e) {

            log.error("Profile image upload failed", e);
            throw new RuntimeException("Image upload failed");
        }
    }
}
