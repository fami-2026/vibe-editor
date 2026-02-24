package org.editor.control.service;

import org.editor.entity.dto.CanvasMeta;
import org.editor.entity.mongo.Canvas;

import java.util.List;

public interface CanvasService {

    List<CanvasMeta> getAllMeta();

    Canvas get(String id);

    CanvasMeta create(String title, String state);

    CanvasMeta update(String id, String title, String state);

    void delete(String id);
}