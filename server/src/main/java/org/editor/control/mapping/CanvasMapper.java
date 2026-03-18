package org.editor.control.mapping;

import org.editor.entity.dto.CanvasDto;
import org.editor.entity.dto.CanvasMeta;
import org.editor.entity.mongo.Canvas;
import org.springframework.stereotype.Component;

@Component
public class CanvasMapper {

    public CanvasMeta mapToMeta(Canvas canvas) {
        return new CanvasMeta(canvas.getId(), canvas.getCreatedAt(), canvas.getUpdatedAt());
    }

    public Canvas mapToCanvas(String id, String state) {
        return new Canvas(id, state);
    }

    public CanvasDto mapToCanvasDto(Canvas canvas) {
        return CanvasDto.builder()
                .id(canvas.getId())
                .createdAt(canvas.getCreatedAt())
                .updatedAt(canvas.getUpdatedAt())
                .content(canvas.getContent())
                .build();
    }
}
