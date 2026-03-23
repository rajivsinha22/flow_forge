package com.flowforge.common.exception;

public class UnauthorizedException extends WorkflowBaseException {

    public UnauthorizedException(String message) {
        super(message, "UNAUTHORIZED");
    }

    public UnauthorizedException() {
        super("Unauthorized access", "UNAUTHORIZED");
    }
}
