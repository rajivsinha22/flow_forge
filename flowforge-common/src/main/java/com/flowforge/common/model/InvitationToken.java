package com.flowforge.common.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Document(collection = "invitation_tokens")
public class InvitationToken {

    @Id
    private String id;

    @Indexed(unique = true)
    private String token;

    private String clientId;

    private String email;

    private String name;

    private List<String> roles;

    private List<String> assignedNamespaces;

    private InviteStatus status;

    private Instant expiresAt;

    private Instant createdAt;

    private Instant acceptedAt;

    public InvitationToken() {
    }

    public InvitationToken(String id, String token, String clientId, String email, String name,
                           List<String> roles, List<String> assignedNamespaces, InviteStatus status,
                           Instant expiresAt, Instant createdAt, Instant acceptedAt) {
        this.id = id;
        this.token = token;
        this.clientId = clientId;
        this.email = email;
        this.name = name;
        this.roles = roles;
        this.assignedNamespaces = assignedNamespaces;
        this.status = status;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.acceptedAt = acceptedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
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

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public List<String> getAssignedNamespaces() {
        return assignedNamespaces;
    }

    public void setAssignedNamespaces(List<String> assignedNamespaces) {
        this.assignedNamespaces = assignedNamespaces;
    }

    public InviteStatus getStatus() {
        return status;
    }

    public void setStatus(InviteStatus status) {
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

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(Instant acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    @Override
    public String toString() {
        return "InvitationToken{" +
                "id='" + id + '\'' +
                ", token='" + token + '\'' +
                ", clientId='" + clientId + '\'' +
                ", email='" + email + '\'' +
                ", name='" + name + '\'' +
                ", roles=" + roles +
                ", assignedNamespaces=" + assignedNamespaces +
                ", status=" + status +
                ", expiresAt=" + expiresAt +
                ", createdAt=" + createdAt +
                ", acceptedAt=" + acceptedAt +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        InvitationToken that = (InvitationToken) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(token, that.token) &&
                Objects.equals(clientId, that.clientId) &&
                Objects.equals(email, that.email) &&
                Objects.equals(name, that.name) &&
                Objects.equals(roles, that.roles) &&
                Objects.equals(assignedNamespaces, that.assignedNamespaces) &&
                status == that.status &&
                Objects.equals(expiresAt, that.expiresAt) &&
                Objects.equals(createdAt, that.createdAt) &&
                Objects.equals(acceptedAt, that.acceptedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, token, clientId, email, name, roles, assignedNamespaces,
                status, expiresAt, createdAt, acceptedAt);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String token;
        private String clientId;
        private String email;
        private String name;
        private List<String> roles;
        private List<String> assignedNamespaces;
        private InviteStatus status;
        private Instant expiresAt;
        private Instant createdAt;
        private Instant acceptedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder token(String token) { this.token = token; return this; }
        public Builder clientId(String clientId) { this.clientId = clientId; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder roles(List<String> roles) { this.roles = roles; return this; }
        public Builder assignedNamespaces(List<String> assignedNamespaces) { this.assignedNamespaces = assignedNamespaces; return this; }
        public Builder status(InviteStatus status) { this.status = status; return this; }
        public Builder expiresAt(Instant expiresAt) { this.expiresAt = expiresAt; return this; }
        public Builder createdAt(Instant createdAt) { this.createdAt = createdAt; return this; }
        public Builder acceptedAt(Instant acceptedAt) { this.acceptedAt = acceptedAt; return this; }

        public InvitationToken build() {
            return new InvitationToken(id, token, clientId, email, name, roles, assignedNamespaces,
                    status, expiresAt, createdAt, acceptedAt);
        }
    }

    public enum InviteStatus {
        PENDING, ACCEPTED, EXPIRED
    }
}
