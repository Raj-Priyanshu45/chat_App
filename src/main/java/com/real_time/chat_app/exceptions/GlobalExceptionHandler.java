package com.real_time.chat_app.exceptions;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(fe -> fe.getField() + " " + fe.getDefaultMessage())
                .orElse("Invalid request");
        return ResponseEntity.badRequest().body(msg);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<String> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body("Malformed request body");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<String> handleTooLarge(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body("File too large");
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntime(RuntimeException e) {

        // Let Spring Security produce its own 401/403 (needed for the /me -> 403 flow)
        if (e instanceof AccessDeniedException ade) throw ade;
        if (e instanceof AuthenticationException ae) throw ae;

        // Spring's own web exceptions already know their status
        if (e instanceof ErrorResponse er) {
            return ResponseEntity.status(er.getStatusCode()).build();
        }

        String msg = e.getMessage() == null ? "" : e.getMessage();
        String lower = msg.toLowerCase();

        HttpStatus status;
        if (lower.contains("not found"))                                  status = HttpStatus.NOT_FOUND;
        else if (lower.contains("password") || lower.contains("unauthorized")
                || lower.startsWith("unable to"))                         status = HttpStatus.FORBIDDEN;
        else if (lower.contains("too large"))                             status = HttpStatus.PAYLOAD_TOO_LARGE;
        else if (lower.startsWith("invalid") || lower.contains("empty")
                || lower.contains("missing"))                             status = HttpStatus.BAD_REQUEST;
        else {
            log.error("Unhandled exception", e);
            return ResponseEntity.internalServerError().body("Something went wrong");
        }

        return ResponseEntity.status(status).body(msg);
    }
}