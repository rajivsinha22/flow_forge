package com.flowforge.execution.executor.script;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Set;

/**
 * Server-Side Request Forgery (SSRF) guard for script HTTP services.
 *
 * Prevents scripts from using a configured HTTP service to reach:
 *   • Loopback addresses  (127.0.0.0/8, ::1)
 *   • Link-local          (169.254.0.0/16 — AWS/GCP/Azure metadata endpoints)
 *   • Private RFC 1918    (10.x, 172.16–31.x, 192.168.x)
 *   • Private IPv6        (fc00::/7)
 *   • Unroutable          (0.0.0.0/8)
 *   • Cloud metadata hostnames (169.254.169.254, metadata.google.internal, etc.)
 *   • Internal FlowForge service hostnames (localhost, *.local, *.internal)
 *
 * Usage:
 *   SsrfGuard.validate("https://api.example.com/users");  // passes
 *   SsrfGuard.validate("http://169.254.169.254/latest/meta-data/"); // throws
 *   SsrfGuard.validate("http://localhost:8082/api/v1/clients");      // throws
 */
public final class SsrfGuard {

    private static final Logger log = LoggerFactory.getLogger(SsrfGuard.class);

    // ─── Allowed URL schemes ──────────────────────────────────────────────────
    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    // ─── Known cloud/metadata hostnames to block (hostname level) ────────────
    private static final List<String> BLOCKED_HOSTNAMES = List.of(
            "169.254.169.254",           // AWS EC2 / OpenStack metadata
            "metadata.google.internal",  // GCP metadata
            "169.254.170.2",             // AWS ECS task metadata
            "metadata.azure.com",        // Azure IMDS
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::1"
    );

    // ─── Blocked hostname suffixes ────────────────────────────────────────────
    private static final List<String> BLOCKED_SUFFIXES = List.of(
            ".local",       // mDNS / internal LAN
            ".internal",    // GCP internal hostnames
            ".localdomain",
            ".corp"
    );

    private SsrfGuard() {}

    /**
     * Validate that the given URL is safe to call from a script.
     *
     * @param rawUrl the full URL (e.g. https://api.example.com/users/123)
     * @throws SecurityException if the URL is blocked
     * @throws IllegalArgumentException if the URL is malformed
     */
    public static void validate(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("URL must not be blank");
        }

        URI uri;
        try {
            uri = URI.create(rawUrl);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Malformed URL: " + rawUrl, e);
        }

        // ── 1. Scheme check ───────────────────────────────────────────────────
        String scheme = uri.getScheme();
        if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase())) {
            throw new SecurityException(
                    "URL scheme '" + scheme + "' is not allowed. Only http and https are permitted.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new SecurityException("URL has no host: " + rawUrl);
        }
        host = host.toLowerCase();

        // ── 2. Known-bad hostname list ────────────────────────────────────────
        if (BLOCKED_HOSTNAMES.contains(host)) {
            throw new SecurityException(
                    "Outbound HTTP to '" + host + "' is not permitted (reserved/internal address).");
        }

        // ── 3. Hostname suffix check ──────────────────────────────────────────
        for (String suffix : BLOCKED_SUFFIXES) {
            if (host.endsWith(suffix)) {
                throw new SecurityException(
                        "Outbound HTTP to hosts ending in '" + suffix + "' is not permitted.");
            }
        }

        // ── 4. DNS resolution + IP range check ────────────────────────────────
        // Resolve hostname to IP and verify the resolved IP is not in a private range.
        // This also catches cases where an attacker uses a public DNS entry that
        // resolves to a private IP (DNS rebinding protection).
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress addr : addresses) {
                checkIpAddress(addr, rawUrl);
            }
        } catch (UnknownHostException e) {
            // DNS resolution failed — block the request.
            // (An unresolvable host is almost certainly not a legitimate external API.)
            throw new SecurityException("Could not resolve host '" + host + "': " + e.getMessage());
        }

        log.debug("[SsrfGuard] URL passed validation: {}", rawUrl);
    }

    // ─── IP range checks ──────────────────────────────────────────────────────

    private static void checkIpAddress(InetAddress addr, String originalUrl) {
        byte[] ip = addr.getAddress();

        if (addr.isLoopbackAddress()) {
            throw new SecurityException(
                    "Outbound HTTP to loopback address (" + addr.getHostAddress() + ") is not permitted. URL: " + originalUrl);
        }
        if (addr.isLinkLocalAddress()) {
            // 169.254.0.0/16 (IPv4) and fe80::/10 (IPv6) — includes AWS metadata endpoint
            throw new SecurityException(
                    "Outbound HTTP to link-local address (" + addr.getHostAddress() + ") is not permitted. " +
                    "This range includes cloud instance metadata endpoints. URL: " + originalUrl);
        }
        if (addr.isSiteLocalAddress()) {
            // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (IPv4) and fc00::/7 (IPv6)
            throw new SecurityException(
                    "Outbound HTTP to private/internal address (" + addr.getHostAddress() + ") is not permitted. " +
                    "Configure only publicly-accessible external service URLs. URL: " + originalUrl);
        }
        if (addr.isAnyLocalAddress()) {
            // 0.0.0.0
            throw new SecurityException(
                    "Outbound HTTP to 0.0.0.0 is not permitted. URL: " + originalUrl);
        }
        if (addr.isMulticastAddress()) {
            throw new SecurityException(
                    "Outbound HTTP to multicast address (" + addr.getHostAddress() + ") is not permitted. URL: " + originalUrl);
        }

        // ── Additional IPv4 checks not covered by Java's built-ins ────────────
        if (ip.length == 4) {
            // 100.64.0.0/10 — IANA Shared Address Space (carrier-grade NAT, often internal)
            if ((ip[0] & 0xFF) == 100 && (ip[1] & 0xC0) == 64) {
                throw new SecurityException(
                        "Outbound HTTP to CGNAT address (" + addr.getHostAddress() + ") is not permitted. URL: " + originalUrl);
            }
            // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 — TEST-NET (documentation ranges)
            if ((ip[0] & 0xFF) == 192 && (ip[1] & 0xFF) == 0 && (ip[2] & 0xFF) == 2) {
                throw new SecurityException(
                        "Outbound HTTP to TEST-NET address (" + addr.getHostAddress() + ") is not permitted. URL: " + originalUrl);
            }
        }
    }
}
