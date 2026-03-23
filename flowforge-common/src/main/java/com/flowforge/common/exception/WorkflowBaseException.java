package com.flowforge.common.exception;

public class WorkflowBaseException extends RuntimeException {

    private final String code;

    public WorkflowBaseException(String message, String code) {
        super(message);
        this.code = code;
    }

    public WorkflowBaseException(String message, String code, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
