package com.flowforge.common.response;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;

public class ApiErrorResponse {

    private String code;
    private String message;
    private Map<String, Object> details;
    private Instant timestamp;

    public ApiErrorResponse() {
    }

    public ApiErrorResponse(String code, String message, Map<String, Object> details, Instant timestamp) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.timestamp = timestamp;
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

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public String toString() {
        return "ApiErrorResponse{" +
                "code='" + code + '\'' +
                ", message='" + message + '\'' +
                ", details=" + details +
                ", timestamp=" + timestamp +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ApiErrorResponse that = (ApiErrorResponse) o;
        return Objects.equals(code, that.code) &&
                Objects.equals(message, that.message) &&
                Objects.equals(details, that.details) &&
                Objects.equals(timestamp, that.timestamp);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code, message, details, timestamp);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String code;
        private String message;
        private Map<String, Object> details;
        private Instant timestamp;

        public Builder code(String code) {
            this.code = code;
            return this;
        }

        public Builder message(String message) {
            this.message = message;
            return this;
        }

        public Builder details(Map<String, Object> details) {
            this.details = details;
            return this;
        }

        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public ApiErrorResponse build() {
            return new ApiErrorResponse(code, message, details, timestamp);
        }
    }

    public static ApiErrorResponse of(String code, String message) {
        ApiErrorResponse r = new ApiErrorResponse();
        r.code = code;
        r.message = message;
        r.timestamp = Instant.now();
        return r;
    }

    public static ApiErrorResponse of(String code, String message, Map<String, Object> details) {
        ApiErrorResponse r = new ApiErrorResponse();
        r.code = code;
        r.message = message;
        r.details = details;
        r.timestamp = Instant.now();
        return r;
    }
}
