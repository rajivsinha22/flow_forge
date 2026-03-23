package com.flowforge.common.exception;

public class ResourceNotFoundException extends WorkflowBaseException {

    public ResourceNotFoundException(String message) {
        super(message, "RESOURCE_NOT_FOUND");
    }

    public ResourceNotFoundException(String resourceType, String id) {
        super(resourceType + " not found with id: " + id, "RESOURCE_NOT_FOUND");
    }
}
