package com.flowforge.common.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Objects;

@Document(collection = "api_keys")
public class ApiKey {

    @Id
    private String id;

    private String clientId;

    private String name;

    private String keyHash;

    private String prefix;

    private Instant createdAt;

    private Instant lastUsedAt;

    private boolean revoked;

    public ApiKey() {
    }

    public ApiKey(String id, String clientId, String name, String keyHash, String prefix,
                  Instant createdAt, Instant lastUsedAt, boolean revoked) {
        this.id = id;
        this.clientId = clientId;
        this.name = name;
        this.keyHash = keyHash;
        this.prefix = prefix;
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

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getKeyHash() {
        return keyHash;
    }

    public void setKeyHash(String keyHash) {
        this.keyHash = keyHash;
    }

    public String getPrefix() {
        return prefix;
    }

    public void setPrefix(String prefix) {
        this.prefix = prefix;
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
    public String toString() {
        return "ApiKey{" +
                "id='" + id + '\'' +
                ", clientId='" + clientId + '\'' +
                ", name='" + name + '\'' +
                ", keyHash='" + keyHash + '\'' +
                ", prefix='" + prefix + '\'' +
                ", createdAt=" + createdAt +
                ", lastUsedAt=" + lastUsedAt +
                ", revoked=" + revoked +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ApiKey that = (ApiKey) o;
        return revoked == that.revoked &&
                Objects.equals(id, that.id) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(name, that.name) &&
                Objects.equals(keyHash, that.keyHash) &&
                Objects.equals(prefix, that.prefix) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(lastUsedAt, that.lastUsedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, clientId, name, keyHash, prefix, createdAt, lastUsedAt, revoked);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String clientId;
        private String name;
        private String keyHash;
        private String prefix;
        private Instant createdAt;
        private Instant lastUsedAt;
        private boolean revoked;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder clientId(String clientId) {
            this.clientId = clientId;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder keyHash(String keyHash) {
            this.keyHash = keyHash;
            return this;
        }

        public Builder prefix(String prefix) {
            this.prefix = prefix;
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

        public ApiKey build() {
            return new ApiKey(id, clientId, name, keyHash, prefix, createdAt, lastUsedAt, revoked);
        }
    }
}
