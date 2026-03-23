package com.flowforge.execution.executor.script;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Runtime proxy for a user-configured MySQL connection.
 *
 * Exposed to Groovy scripts as:
 *   db.connections.myDb.query('SELECT * FROM users WHERE id = ?', [ctx.input.userId])
 *   db.connections.myDb.queryOne('SELECT * FROM users WHERE email = ?', ['a@b.com'])
 *   db.connections.myDb.execute('INSERT INTO events (type) VALUES (?)', ['LOGIN'])
 *   db.connections.myDb.execute('UPDATE users SET status = ? WHERE id = ?', ['active', 1])
 *
 * A JDBC Connection is created per script execution and closed in the finally block
 * of ScriptStepExecutor to avoid connection leaks.
 */
public class ScriptMySqlProxy implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(ScriptMySqlProxy.class);

    private final String name;
    private final Connection connection;

    /** Only alphanumerics, underscore, hyphen allowed in host/db/user fields. */
    private static final java.util.regex.Pattern SAFE_IDENTIFIER =
            java.util.regex.Pattern.compile("^[a-zA-Z0-9_\\-]{1,128}$");

    /** Allow dots in host (e.g. db.prod.example.com) but still no special chars. */
    private static final java.util.regex.Pattern SAFE_HOSTNAME =
            java.util.regex.Pattern.compile("^[a-zA-Z0-9_\\-\\.]{1,253}$");

    public ScriptMySqlProxy(Map<String, Object> connConfig, Map<String, String> envVars)
            throws SQLException {
        this.name = str(connConfig, "name", "mysql");

        String host     = str(connConfig, "host",     "localhost");
        int    port     = intVal(connConfig, "port",   3306);
        String dbName   = str(connConfig, "database", "");
        String username = str(connConfig, "username", "root");
        String passVar  = str(connConfig, "passwordEnvVar", "");
        String password = passVar.isBlank() ? "" : envVars.getOrDefault(passVar, "");

        // ── JDBC URL injection prevention ─────────────────────────────────────
        // host, dbName, username are interpolated directly into the JDBC URL.
        // Validate each field strictly before any string-formatting.
        // Attack example without this: dbName = "mydb?allowMultiQueries=true&logger=com.evil.Logger"
        validateHostname("host", host);
        validateIdentifier("database", dbName);
        validateIdentifier("username", username);
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("MySQL port must be 1–65535, got: " + port);
        }

        // ── Internal host check (SSRF via TCP) ────────────────────────────────
        validateNotInternalHost(host);

        // ── Build JDBC URL from validated components only ─────────────────────
        // Use a fixed, safe parameter set — no user-controlled parameters in the URL.
        // The driver version, SSL mode, and timezone are hard-coded here.
        String jdbcUrl = String.format(
                "jdbc:mysql://%s:%d/%s" +
                "?useSSL=false" +
                "&allowPublicKeyRetrieval=true" +
                "&serverTimezone=UTC" +
                "&connectTimeout=10000" +       // 10s connection timeout (ms)
                "&socketTimeout=30000" +        // 30s socket read timeout (ms)
                "&autoReconnect=false" +        // explicit — no silent reconnects
                "&maxReconnects=0",
                host, port, dbName
        );

        log.debug("[ScriptMySqlProxy:{}] Connecting to jdbc:mysql://{}:{}/{}", name, host, port, dbName);

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            throw new SQLException("MySQL JDBC driver not found on classpath", e);
        }

        this.connection = DriverManager.getConnection(jdbcUrl, username, password);
        this.connection.setAutoCommit(true);
    }

    private static void validateIdentifier(String field, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("MySQL connection field '" + field + "' must not be blank");
        }
        if (!SAFE_IDENTIFIER.matcher(value).matches()) {
            throw new SecurityException(
                    "MySQL connection field '" + field + "' contains invalid characters. " +
                    "Only alphanumeric, underscore, and hyphen are allowed (max 128 chars).");
        }
    }

    private static void validateHostname(String field, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("MySQL connection field '" + field + "' must not be blank");
        }
        if (!SAFE_HOSTNAME.matcher(value).matches()) {
            throw new SecurityException(
                    "MySQL connection field '" + field + "' contains invalid characters.");
        }
    }

    private static void validateNotInternalHost(String host) {
        String lower = host.toLowerCase();
        if (lower.equals("localhost") || lower.equals("127.0.0.1") ||
                lower.equals("::1") || lower.startsWith("169.254.") ||
                lower.endsWith(".local") || lower.endsWith(".internal")) {
            throw new SecurityException(
                    "MySQL connection to internal/loopback host '" + host + "' is not permitted.");
        }
    }

    // ─── Public API (called from Groovy scripts) ───────────────────────────────

    /**
     * Run a SELECT query and return all matching rows as a list of maps.
     * Params are positional (?) bindings.
     *
     * Example: db.connections.myDb.query('SELECT * FROM users WHERE status = ?', ['active'])
     */
    public List<Map<String, Object>> query(String sql, List<?> params) throws SQLException {
        log.debug("[ScriptMySqlProxy:{}] query: {}", name, sql);
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            bindParams(ps, params);
            try (ResultSet rs = ps.executeQuery()) {
                return resultSetToList(rs);
            }
        }
    }

    /** Convenience overload — no parameters. */
    public List<Map<String, Object>> query(String sql) throws SQLException {
        return query(sql, List.of());
    }

    /**
     * Run a SELECT query and return the first row, or null if no results.
     *
     * Example: db.connections.myDb.queryOne('SELECT * FROM users WHERE id = ?', [1])
     */
    public Map<String, Object> queryOne(String sql, List<?> params) throws SQLException {
        log.debug("[ScriptMySqlProxy:{}] queryOne: {}", name, sql);
        List<Map<String, Object>> results = query(sql, params);
        return results.isEmpty() ? null : results.get(0);
    }

    /** Convenience overload — no parameters. */
    public Map<String, Object> queryOne(String sql) throws SQLException {
        return queryOne(sql, List.of());
    }

    /**
     * Execute an INSERT, UPDATE, or DELETE statement.
     * Returns { affectedRows, insertId } where insertId is the generated key (for INSERT).
     *
     * Example: db.connections.myDb.execute('INSERT INTO logs (msg) VALUES (?)', ['started'])
     */
    public Map<String, Object> execute(String sql, List<?> params) throws SQLException {
        log.debug("[ScriptMySqlProxy:{}] execute: {}", name, sql);
        try (PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            bindParams(ps, params);
            int affected = ps.executeUpdate();

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("affectedRows", affected);

            // Retrieve generated key if any (relevant for INSERT)
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    result.put("insertId", keys.getLong(1));
                } else {
                    result.put("insertId", null);
                }
            }
            return result;
        }
    }

    /** Convenience overload — no parameters. */
    public Map<String, Object> execute(String sql) throws SQLException {
        return execute(sql, List.of());
    }

    /**
     * Begin a transaction. Use commitTransaction() and rollbackTransaction() to finish it.
     * Auto-commit is turned off for the duration.
     */
    public void beginTransaction() throws SQLException {
        connection.setAutoCommit(false);
        log.debug("[ScriptMySqlProxy:{}] Transaction started", name);
    }

    public void commitTransaction() throws SQLException {
        connection.commit();
        connection.setAutoCommit(true);
        log.debug("[ScriptMySqlProxy:{}] Transaction committed", name);
    }

    public void rollbackTransaction() throws SQLException {
        connection.rollback();
        connection.setAutoCommit(true);
        log.warn("[ScriptMySqlProxy:{}] Transaction rolled back", name);
    }

    // ─── AutoCloseable ────────────────────────────────────────────────────────

    @Override
    public void close() {
        try {
            if (connection != null && !connection.isClosed()) {
                // Ensure any open transaction is rolled back before closing
                if (!connection.getAutoCommit()) {
                    try { connection.rollback(); } catch (Exception ignored) {}
                }
                connection.close();
                log.debug("[ScriptMySqlProxy:{}] Connection closed", name);
            }
        } catch (Exception e) {
            log.warn("[ScriptMySqlProxy:{}] Error closing connection: {}", name, e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Maximum time (seconds) any single SQL statement is allowed to run. */
    private static final int QUERY_TIMEOUT_SECONDS = 25;

    private void bindParams(PreparedStatement ps, List<?> params) throws SQLException {
        // Apply per-statement timeout so a slow query can't block the script thread
        // beyond the overall script timeout
        try { ps.setQueryTimeout(QUERY_TIMEOUT_SECONDS); } catch (SQLException ignored) {}

        if (params == null) return;
        for (int i = 0; i < params.size(); i++) {
            Object p = params.get(i);
            if (p == null) {
                ps.setNull(i + 1, java.sql.Types.NULL);
            } else {
                ps.setObject(i + 1, p);
            }
        }
    }

    private List<Map<String, Object>> resultSetToList(ResultSet rs) throws SQLException {
        ResultSetMetaData meta = rs.getMetaData();
        int cols = meta.getColumnCount();
        List<Map<String, Object>> rows = new ArrayList<>();

        while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= cols; i++) {
                String colName = meta.getColumnLabel(i);
                Object val     = rs.getObject(i);
                // Convert java.sql.Date / Timestamp to ISO string for easier use in scripts
                if (val instanceof java.sql.Timestamp ts) {
                    val = ts.toInstant().toString();
                } else if (val instanceof java.sql.Date d) {
                    val = d.toString();
                }
                row.put(colName, val);
            }
            rows.add(row);
        }
        return rows;
    }

    private static String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key);
        return v != null && !String.valueOf(v).isBlank() ? String.valueOf(v) : def;
    }

    private static int intVal(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return def; }
    }
}
