package com.flowforge.client.dto;

import java.time.Instant;
import java.util.Objects;

public class ApiKeyResponse {

    private String id;
    private String name;
    private String prefix;
    /** Full key only returned on creation, null on subsequent reads */
    private String key;
    private Instant createdAt;
    private Instant lastUsedAt;
    private boolean revoked;

    public ApiKeyResponse() {
    }

    public ApiKeyResponse(String id, String name, String prefix, String key,
                          Instant createdAt, Instant lastUsedAt, boolean revoked) {
        this.id = id;
        this.name = name;
        this.prefix = prefix;
        this.key = key;
        this.createdAt = createdAt;
        this.lastUsedAt = lastUsedAt;
        this.revoked = revoked;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPrefix() {
        return prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }

    public void setLastUsedAt(Instant lastUsedAt) {
        this.lastUsedAt = lastUsedAt;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ApiKeyResponse that = (ApiKeyResponse) o;
        return revoked == that.revoked &&
                Objects.equals(id, that.id) &&
                Objects.equals(name, that.name) &&
                Objects.equals(prefix, that.prefix) &&
                Objects.equals(key, that.key) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(lastUsedAt, that.lastUsedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, prefix, key, createdAt, lastUsedAt, revoked);
    }

    @Override
    public String toString() {
        return "ApiKeyResponse{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", prefix='" + prefix + '\'' +
                ", key='[PROTECTED]'" +
                ", createdAt=" + createdAt +
                ", lastUsedAt=" + lastUsedAt +
                ", revoked=" + revoked +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String name;
        private String prefix;
        private String key;
        private Instant createdAt;
        private Instant lastUsedAt;
        private boolean revoked;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder prefix(String prefix) {
            this.prefix = prefix;
            return this;
        }

        public Builder key(String key) {
            this.key = key;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder lastUsedAt(Instant lastUsedAt) {
            this.lastUsedAt = lastUsedAt;
            return this;
        }

        public Builder revoked(boolean revoked) {
            this.revoked = revoked;
            return this;
        }

        public ApiKeyResponse build() {
            return new ApiKeyResponse(id, name, prefix, key, createdAt, lastUsedAt, revoked);
        }
    }
}
