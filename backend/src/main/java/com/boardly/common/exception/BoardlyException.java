package com.boardly.common.exception;

public class BoardlyException extends RuntimeException {
    private final int status;
    private final String code;

    public BoardlyException(String message, int status) {
        this(message, status, "REQUEST_FAILED");
    }

    public BoardlyException(String message, int status, String code) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public int getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
