package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Services.ImageVideoService;
import com.real_time.chat_app.Services.chatService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat")
public class chatController {

    private final chatService chatService;
    private final ImageVideoService fileService;

    @MessageMapping("/sendMessages/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public Message sendMessage(
            @DestinationVariable String roomId,
            @RequestBody MessageRequest request,
            Principal principal
    ) {
        return chatService.sendMessage(request, roomId, principal.getName());
    }

    @MessageMapping("dm/{username}")
    public Message dmMessage(
            @DestinationVariable String username ,
            @RequestBody MessageRequest request ,
            Principal principal
    ){
        return chatService.sendDm(username , request , principal.getName());
    }

    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public String handleException(RuntimeException e) {
        return e.getMessage();
    }



    @PostMapping("/upload/{roomId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> saveFile(
            @PathVariable String roomId,
            @RequestParam("files") MultipartFile[] files,
            Principal principal
    ) throws IOException {

        return ResponseEntity.ok(
                fileService.uploadFiles(files, principal.getName(), roomId)
        );
    }

    @PostMapping("/dm/{roomId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> sendDmFiles(
            @PathVariable String roomId,
            @RequestParam("files") MultipartFile[] files,
            Principal principal
    ) throws IOException {

        return ResponseEntity.ok(
                fileService.uploadFiles(files, principal.getName(), roomId)
        );
    }

    @GetMapping("/ret/{filename}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Resource> exchangePath(
            @PathVariable String filename
    ) throws IOException {

        Path path = Paths.get("/home/devxraj/Java/ChatAppStorage").resolve(filename);

        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(path.toUri());
        String contentType = Files.probeContentType(path);

        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

}