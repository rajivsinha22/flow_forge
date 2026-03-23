package com.flowforge.workflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request body for creating or updating a {@link com.flowforge.workflow.model.DataModel}.
 */
public class DataModelRequest {

    @NotBlank(message = "Model name is required")
    @Size(min = 1, max = 100, message = "Name must be between 1 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z][a-zA-Z0-9_-]*$",
             message = "Name must start with a letter and contain only letters, numbers, underscores, or hyphens")
    private String name;

    @Size(max = 500, message = "Description may not exceed 500 characters")
    private String description;

    /**
     * JSON Schema Draft-07 document as a raw JSON string.
     * Must be valid JSON; the service validates it before persisting.
     */
    @NotBlank(message = "Schema JSON is required")
    private String schemaJson;

    /** Comma-separated tags for filtering and organisation */
    private String tags;

    private boolean active = true;

    public DataModelRequest() {
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSchemaJson() { return schemaJson; }
    public void setSchemaJson(String schemaJson) { this.schemaJson = schemaJson; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
