package com.flowforge.workflow.model;

import java.util.Objects;

public class EdgeDef {

    private String id;
    private String source;
    private String target;
    private String label; // SUCCESS, FAILURE, or condition branch label

    public EdgeDef() {
    }

    public EdgeDef(String id, String source, String target, String label) {
        this.id = id;
        this.source = source;
        this.target = target;
        this.label = label;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        EdgeDef that = (EdgeDef) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(source, that.source) &&
                Objects.equals(target, that.target) &&
                Objects.equals(label, that.label);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, source, target, label);
    }

    @Override
    public String toString() {
        return "EdgeDef{id='" + id + '\'' +
                ", source='" + source + '\'' +
                ", target='" + target + '\'' +
                ", label='" + label + '\'' + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String source;
        private String target;
        private String label;

        public Builder id(String id) { this.id = id; return this; }
        public Builder source(String source) { this.source = source; return this; }
        public Builder target(String target) { this.target = target; return this; }
        public Builder label(String label) { this.label = label; return this; }

        public EdgeDef build() {
            return new EdgeDef(id, source, target, label);
        }
    }
}
