package com.flowforge.client.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Objects;

public class AcceptInviteRequest {

    @NotBlank(message = "Token is required")
    private String token;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    public AcceptInviteRequest() {
    }

    public AcceptInviteRequest(String token, String password) {
        this.token = token;
        this.password = password;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AcceptInviteRequest that = (AcceptInviteRequest) o;
        return Objects.equals(token, that.token) &&
                Objects.equals(password, that.password);
    }

    @Override
    public int hashCode() {
        return Objects.hash(token, password);
    }

    @Override
    public String toString() {
        return "AcceptInviteRequest{" +
                "token='" + token + '\'' +
                ", password='[PROTECTED]'" +
                '}';
    }
}
