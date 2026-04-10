package com.flowforge.billing.config;

public class PlanLimitExceededException extends RuntimeException {

    public PlanLimitExceededException(String message) {
        super(message);
    }

    public PlanLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
