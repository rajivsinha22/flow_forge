package com.flowforge.client.dto;

import com.flowforge.common.model.InvitationToken;

import java.time.Instant;
import java.util.Objects;

public class InvitationDto {

    private String token;
    private String email;
    private String name;
    private String orgName;
    private InvitationToken.InviteStatus status;
    private Instant expiresAt;
    private Instant createdAt;

    public InvitationDto() {
    }

    public InvitationDto(String token, String email, String name, String orgName,
                         InvitationToken.InviteStatus status, Instant expiresAt, Instant createdAt) {
        this.token = token;
        this.email = email;
        this.name = name;
        this.orgName = orgName;
        this.status = status;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOrgName() {
        return orgName;
    }

    public void setOrgName(String orgName) {
        this.orgName = orgName;
    }

    public InvitationToken.InviteStatus getStatus() {
        return status;
    }

    public void setStatus(InvitationToken.InviteStatus status) {
        this.status = status;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InvitationDto that = (InvitationDto) o;
        return Objects.equals(token, that.token) &&
                Objects.equals(email, that.email) &&
                Objects.equals(name, that.name) &&
                Objects.equals(orgName, that.orgName) &&
                status == that.status &&
                Objects.equals(expiresAt, that.expiresAt) &&
                Objects.equals(createdAt, that.createdAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(token, email, name, orgName, status, expiresAt, createdAt);
    }

    @Override
    public String toString() {
        return "InvitationDto{" +
                "token='" + token + '\'' +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", orgName='" + orgName + '\'' +
                ", status=" + status +
                ", expiresAt=" + expiresAt +
                ", createdAt=" + createdAt +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String token;
        private String email;
        private String name;
        private String orgName;
        private InvitationToken.InviteStatus status;
        private Instant expiresAt;
        private Instant createdAt;

        public Builder token(String token) { this.token = token; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder orgName(String orgName) { this.orgName = orgName; return this; }
        public Builder status(InvitationToken.InviteStatus status) { this.status = status; return this; }
        public Builder expiresAt(Instant expiresAt) { this.expiresAt = expiresAt; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }

        public InvitationDto build() {
            return new InvitationDto(token, email, name, orgName, status, expiresAt, createdAt);
        }
    }
}
