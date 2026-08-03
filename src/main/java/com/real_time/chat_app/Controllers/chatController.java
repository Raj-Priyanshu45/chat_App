package com.real_time.chat_app.Controllers;

import com.real_time.chat_app.DTOs.MessageRequest;
import com.real_time.chat_app.Models.Message;
import com.real_time.chat_app.Services.ImageVideoService;
import com.real_time.chat_app.Services.chatService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
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
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.Principal;

@Controller
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat")
public class chatController {

    private final chatService chatService;

    private final ImageVideoService fileService;


    //@MessageMapping -> it is like post mapping of WebSocket
                        //it is used to take the messages

    //@Sendto -> it is used to redirect message to specific location
                //sending message


    // @PreAuthorize("hasRole('USER')")
    @MessageMapping("/sendMessages/{roomId}")
    //for sending and receiving message
    @SendTo("/topic/room/{roomId}")
    //for subscribe to channel
    //used to publish message to all the topic or groups
//    @PreAuthorize("isAuthenticated()")
    public Message sendMessage(
            @DestinationVariable String roomId ,
            @RequestBody MessageRequest request ,
            Principal principal
    ){

        return chatService.sendMessage(request , roomId , principal.getName());
    }


    @MessageExceptionHandler(RuntimeException.class)
    @SendToUser("/queue/errors")
    public String handleException(RuntimeException e){
        return e.getMessage();
    }

    @PostMapping("/upload/{roomId}")
    public ResponseEntity<?> saveFile(
            @PathVariable String roomId,
            @RequestParam("files") MultipartFile[] files,
            Principal principal
    ) throws IOException {

        return ResponseEntity.ok(
                fileService.uploadFiles(files, principal.getName(), roomId)
        );
    }

    @GetMapping("ret/{filename}")
    public ResponseEntity<?> exchangePath(
            @PathVariable String filename
    ) throws MalformedURLException {

        Path path = Paths.get("/home/devxraj/Java/ChatAppStorage")
                .resolve(filename);

        Resource resource = new UrlResource(path.toUri());

        return ResponseEntity.ok(resource);
    }
}
