package org.editor.control.service;

import static java.util.Objects.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.editor.control.dao.CanvasRepository;
import org.editor.control.handler.exception.CanvasNotExistException;
import org.editor.control.handler.exception.EditorValidationException;
import org.editor.control.mapping.CanvasMapper;
import org.editor.entity.dto.CanvasMeta;
import org.editor.entity.mongo.Canvas;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CanvasServiceImpl implements CanvasService {

    private final CanvasRepository canvasRepository;

    private final CanvasMapper canvasMapper;

    private static final Random RANDOM = new Random();

    @Override
    public List<CanvasMeta> getAllMeta() {
        return canvasRepository.findAll().stream().map(canvasMapper::mapToMeta).toList();
    }

    @Override
    public Canvas get(String id) {
        return canvasRepository.findById(id).orElseThrow(CanvasNotExistException::new);
    }

    @Override
    public Canvas create(String content) {
        if (isNull(content) || content.isBlank()) {
            throw new EditorValidationException("Not all required fields are represented");
        }

        return canvasRepository.save(canvasMapper.mapToCanvas(generateCanvasId(), content));
    }

    @Override
    public Canvas update(String id, String content) {
        Canvas canvas = get(id);

        if (nonNull(canvas.getContent())) {
            canvas.setContent(content);
            canvas.setUpdatedAt(LocalDateTime.now());
        }

        return canvasRepository.save(canvas);
    }

    @Override
    public void delete(String id) {
        canvasRepository.delete(get(id));
    }

    private String generateId() {
        StringBuilder id = new StringBuilder();
        id.append(RANDOM.nextInt(9) + 1);

        for (int i = 0; i < 5; i++) {
            id.append(RANDOM.nextInt(10));
        }

        return id.toString();
    }

    private String generateCanvasId() {
        String id = generateId();

        while (canvasRepository.existsById(id)) {
            id = generateId();
        }

        return id;
    }
}
