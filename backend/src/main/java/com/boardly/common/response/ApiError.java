package com.boardly.common.response;

public class ApiError {
    private int status;
    private String code;
    private String message;

    public ApiError(int status, String message) {
        this(status, "REQUEST_FAILED", message);
    }

    public ApiError(int status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
