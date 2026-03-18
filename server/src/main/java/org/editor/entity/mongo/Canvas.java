package org.editor.entity.mongo;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.core.mapping.MongoId;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "canvas")
public class Canvas {

    @MongoId(FieldType.STRING)
    private String id;

    private String content;

    @CreatedDate
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public Canvas(String id, String state) {
        this.id = id;
        this.content = state;
        this.createdAt = LocalDateTime.now();
    }
}
