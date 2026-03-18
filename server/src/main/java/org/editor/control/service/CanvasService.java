package org.editor.control.service;

import java.util.List;
import org.editor.entity.dto.CanvasMeta;
import org.editor.entity.mongo.Canvas;

public interface CanvasService {

    List<CanvasMeta> getAllMeta();

    Canvas get(String id);

    Canvas create(String content);

    Canvas update(String id, String content);

    void delete(String id);
}
