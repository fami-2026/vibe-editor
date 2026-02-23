package org.editor.entity.dto;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record CanvasDto(
        String id,
        String title,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String state) {
}