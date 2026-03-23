package com.flowforge.workflow.dto;

import java.util.List;
import java.util.Objects;

public class ValidationResult {

    private boolean valid;
    private List<String> errors;
    private List<String> warnings;

    public ValidationResult() {
    }

    public ValidationResult(boolean valid, List<String> errors, List<String> warnings) {
        this.valid = valid;
        this.errors = errors;
        this.warnings = warnings;
    }

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationResult that = (ValidationResult) o;
        return valid == that.valid &&
                Objects.equals(errors, that.errors) &&
                Objects.equals(warnings, that.warnings);
    }

    @Override
    public int hashCode() {
        return Objects.hash(valid, errors, warnings);
    }

    @Override
    public String toString() {
        return "ValidationResult{valid=" + valid + ", errors=" + errors + ", warnings=" + warnings + '}';
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private boolean valid;
        private List<String> errors;
        private List<String> warnings;

        public Builder valid(boolean valid) { this.valid = valid; return this; }
        public Builder errors(List<String> errors) { this.errors = errors; return this; }
        public Builder warnings(List<String> warnings) { this.warnings = warnings; return this; }

        public ValidationResult build() {
            return new ValidationResult(valid, errors, warnings);
        }
    }
}
