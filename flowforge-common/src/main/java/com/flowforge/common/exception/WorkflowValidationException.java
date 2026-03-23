package com.flowforge.common.exception;

public class WorkflowValidationException extends WorkflowBaseException {

    public WorkflowValidationException(String message) {
        super(message, "VALIDATION_ERROR");
    }

    public WorkflowValidationException(String message, String code) {
        super(message, code);
    }
}
