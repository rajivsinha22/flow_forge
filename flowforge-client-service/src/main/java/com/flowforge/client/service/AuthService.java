package com.flowforge.client.service;

import com.flowforge.client.dto.LoginRequest;
import com.flowforge.client.dto.LoginResponse;
import com.flowforge.client.dto.UserDto;
import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.common.exception.UnauthorizedException;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final ClientUserRepository clientUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpiration;

    public AuthService(ClientUserRepository clientUserRepository,
                       PasswordEncoder passwordEncoder,
                       RedisTemplate<String, String> redisTemplate) {
        this.clientUserRepository = clientUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.redisTemplate = redisTemplate;
    }

    public LoginResponse authenticate(LoginRequest request) {
        ClientUser user = clientUserRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (user.getStatus() != ClientUser.UserStatus.ACTIVE) {
            throw new UnauthorizedException("User account is inactive");
        }

        String token = generateJwt(user);

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(user.getRoles())
                .status(user.getStatus())
                .build();

        return LoginResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(userDto)
                .build();
    }

    public String generateJwt(ClientUser user) {
        JwtUtil jwtUtil = new JwtUtil(jwtSecret, jwtExpiration);
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", user.getEmail());
        claims.put("userId", user.getId());
        claims.put("clientId", user.getClientId());
        claims.put("roles", user.getRoles());
        return jwtUtil.generateToken(claims);
    }

    public LoginResponse refreshToken(String refreshToken) {
        JwtUtil jwtUtil = new JwtUtil(jwtSecret, jwtExpiration);

        if (!jwtUtil.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        // Check if token is blacklisted
        String blacklistKey = "blacklist:" + refreshToken;
        if (Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey))) {
            throw new UnauthorizedException("Token has been revoked");
        }

        String userId = jwtUtil.extractUserId(refreshToken);
        ClientUser user = clientUserRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        String newToken = generateJwt(user);

        UserDto userDto = UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(user.getRoles())
                .status(user.getStatus())
                .build();

        return LoginResponse.builder()
                .accessToken(newToken)
                .tokenType("Bearer")
                .expiresIn(jwtExpiration / 1000)
                .user(userDto)
                .build();
    }

    public void logout(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        // Blacklist the token in Redis
        String blacklistKey = "blacklist:" + token;
        redisTemplate.opsForValue().set(blacklistKey, "revoked", jwtExpiration, TimeUnit.MILLISECONDS);
        log.info("Token blacklisted for logout");
    }
}
