package com.flowforge.execution.dto;

import java.util.Objects;

public class ChatCitation {

    private String type; // "execution" | "workflow"
    private String id;
    private String label;

    public ChatCitation() {
    }

    public ChatCitation(String type, String id, String label) {
        this.type = type;
        this.id = id;
        this.label = label;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChatCitation that = (ChatCitation) o;
        return Objects.equals(type, that.type) && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(type, id);
    }
}
