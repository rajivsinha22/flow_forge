package com.flowforge.client.dto;

import com.flowforge.common.model.ClientUser;

import java.util.List;
import java.util.Objects;

public class UserDto {

    private String id;
    private String name;
    private String email;
    private List<String> roles;
    private ClientUser.UserStatus status;

    public UserDto() {
    }

    public UserDto(String id, String name, String email, List<String> roles,
                   ClientUser.UserStatus status) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.roles = roles;
        this.status = status;
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }

    public ClientUser.UserStatus getStatus() {
        return status;
    }

    public void setStatus(ClientUser.UserStatus status) {
        this.status = status;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDto that = (UserDto) o;
        return Objects.equals(id, that.id) &&
                Objects.equals(name, that.name) &&
                Objects.equals(email, that.email) &&
                Objects.equals(roles, that.roles) &&
                status == that.status;
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, email, roles, status);
    }

    @Override
    public String toString() {
        return "UserDto{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", roles=" + roles +
                ", status=" + status +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String name;
        private String email;
        private List<String> roles;
        private ClientUser.UserStatus status;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder roles(List<String> roles) {
            this.roles = roles;
            return this;
        }

        public Builder status(ClientUser.UserStatus status) {
            this.status = status;
            return this;
        }

        public UserDto build() {
            return new UserDto(id, name, email, roles, status);
        }
    }
}
