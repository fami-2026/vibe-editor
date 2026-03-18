package org.editor.control.handler;

import org.editor.control.handler.exception.CanvasNotExistException;
import org.editor.control.handler.exception.EditorException;
import org.editor.entity.dto.Response;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.ResponseStatus;

@ControllerAdvice
public class EditorHandler {

    @ExceptionHandler({CanvasNotExistException.class})
    @ResponseBody
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Response catchException(CanvasNotExistException e) {
        return new Response(HttpStatus.NOT_FOUND.value(), e.getMessage());
    }

    @ExceptionHandler({EditorException.class})
    @ResponseBody
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Response catchEditorException(EditorException e) {
        return new Response(HttpStatus.BAD_REQUEST.value(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseBody
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Response handleUnexpected(Exception e) {
        return new Response(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Internal server error: " + e.getMessage());
    }
}
