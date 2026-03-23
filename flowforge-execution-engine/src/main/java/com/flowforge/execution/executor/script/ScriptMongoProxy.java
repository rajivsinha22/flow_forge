package com.flowforge.execution.executor.script;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.InsertOneResult;
import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Runtime proxy for a user-configured MongoDB connection.
 *
 * Exposed to Groovy scripts as:
 *   db.connections.myMongo.findOne('users', [_id: 'abc'])
 *   db.connections.myMongo.find('orders', [status: 'PENDING'], [limit: 50])
 *   db.connections.myMongo.insertOne('events', [type: 'LOGIN', ts: new Date()])
 *   db.connections.myMongo.updateOne('users', [_id: 'abc'], [status: 'ACTIVE'])
 *   db.connections.myMongo.deleteOne('sessions', [token: tok])
 *   db.connections.myMongo.count('orders', [status: 'OPEN'])
 *
 * A new MongoClient is created per script execution and closed in the finally block
 * of ScriptStepExecutor to avoid connection leaks.
 */
public class ScriptMongoProxy implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(ScriptMongoProxy.class);

    private final String name;
    private final MongoClient client;
    private final MongoDatabase database;

    /** Characters that must not appear in any connection-string component. */
    private static final java.util.regex.Pattern SAFE_IDENTIFIER =
            java.util.regex.Pattern.compile("^[a-zA-Z0-9_\\-\\.]{1,128}$");

    @SuppressWarnings("unchecked")
    public ScriptMongoProxy(Map<String, Object> connConfig, Map<String, String> envVars) {
        this.name = str(connConfig, "name", "mongo");

        String host     = str(connConfig, "host", "localhost");
        int    port     = intVal(connConfig, "port", 27017);
        String dbName   = str(connConfig, "database", "");
        String username = str(connConfig, "username", "");
        String passVar  = str(connConfig, "passwordEnvVar", "");
        String password = passVar.isBlank() ? "" : envVars.getOrDefault(passVar, "");

        // ── Connection string injection prevention ────────────────────────────
        // Validate each component before interpolating into the URI.
        // The 'host' field is the most dangerous — it could contain '@' to redirect
        // authentication, or inject query parameters after a '?'.
        validateIdentifier("host", host);
        validateIdentifier("database", dbName);
        if (!username.isBlank()) {
            validateIdentifier("username", username);
        }
        if (port < 1 || port > 65535) {
            throw new IllegalArgumentException("MongoDB port must be 1–65535, got: " + port);
        }

        // ── SSRF check — block connections to cloud metadata / internal addresses
        // Note: MongoDB connections are TCP, not HTTP, so SsrfGuard's HTTP logic
        // doesn't apply directly. We do a raw hostname check here.
        validateNotInternalHost(host);

        // ── Build connection string using validated components only ───────────
        String connectionString;
        if (!username.isBlank() && !password.isBlank()) {
            // URL-encode username and password to prevent any injection via special chars
            String encodedUser = java.net.URLEncoder.encode(username, java.nio.charset.StandardCharsets.UTF_8);
            String encodedPass = java.net.URLEncoder.encode(password, java.nio.charset.StandardCharsets.UTF_8);
            connectionString = String.format("mongodb://%s:%s@%s:%d/%s?authSource=admin",
                    encodedUser, encodedPass, host, port, dbName);
        } else {
            connectionString = String.format("mongodb://%s:%d/%s", host, port, dbName);
        }

        // ── Apply connection + server selection timeouts ───────────────────────
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(connectionString))
                .applyToSocketSettings(b -> b
                        .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS))
                .applyToClusterSettings(b -> b
                        .serverSelectionTimeout(10, java.util.concurrent.TimeUnit.SECONDS))
                .build();

        log.debug("[ScriptMongoProxy:{}] Connecting to mongodb://{}:{}/{}", name, host, port, dbName);
        this.client   = MongoClients.create(settings);
        this.database = client.getDatabase(dbName);
    }

    private static void validateIdentifier(String field, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("MongoDB connection '" + field + "' must not be blank");
        }
        if (!SAFE_IDENTIFIER.matcher(value).matches()) {
            throw new SecurityException(
                    "MongoDB connection field '" + field + "' contains invalid characters. " +
                    "Only alphanumeric, underscore, hyphen, and dot are allowed.");
        }
    }

    private static void validateNotInternalHost(String host) {
        String lower = host.toLowerCase();
        if (lower.equals("localhost") || lower.equals("127.0.0.1") ||
                lower.equals("::1") || lower.startsWith("169.254.") ||
                lower.endsWith(".local") || lower.endsWith(".internal")) {
            throw new SecurityException(
                    "MongoDB connection to internal/loopback host '" + host + "' is not permitted.");
        }
    }

    // ─── Public API (called from Groovy scripts) ───────────────────────────────

    /** Find the first document matching the filter. Returns null if not found. */
    public Map<String, Object> findOne(String collectionName, Map<String, Object> filter) {
        log.debug("[ScriptMongoProxy:{}] findOne on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);
        Document doc = coll.find(toBson(filter)).first();
        return doc != null ? documentToMap(doc) : null;
    }

    /** Find all documents matching the filter. */
    public List<Map<String, Object>> find(String collectionName, Map<String, Object> filter) {
        return find(collectionName, filter, Map.of());
    }

    /**
     * Find documents with optional options map.
     * Options: limit (int), skip (int), sort (Map)
     */
    public List<Map<String, Object>> find(String collectionName,
                                           Map<String, Object> filter,
                                           Map<String, Object> options) {
        log.debug("[ScriptMongoProxy:{}] find on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);
        FindIterable<Document> iter = coll.find(toBson(filter));

        if (options != null) {
            if (options.containsKey("limit")) {
                iter = iter.limit(intVal(options, "limit", 100));
            }
            if (options.containsKey("skip")) {
                iter = iter.skip(intVal(options, "skip", 0));
            }
            if (options.get("sort") instanceof Map<?, ?> sortMap) {
                Document sortDoc = new Document();
                sortMap.forEach((k, v) -> sortDoc.append(String.valueOf(k),
                        v instanceof Number ? ((Number) v).intValue() : 1));
                iter = iter.sort(sortDoc);
            }
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (Document doc : iter) {
            results.add(documentToMap(doc));
        }
        return results;
    }

    /** Insert a single document. Returns { insertedId, acknowledged }. */
    public Map<String, Object> insertOne(String collectionName, Map<String, Object> doc) {
        log.debug("[ScriptMongoProxy:{}] insertOne on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);
        Document document = new Document(doc);
        InsertOneResult result = coll.insertOne(document);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("acknowledged", result.wasAcknowledged());
        response.put("insertedId", result.getInsertedId() != null
                ? result.getInsertedId().asObjectId().getValue().toHexString()
                : null);
        return response;
    }

    /**
     * Update the first document matching the filter.
     * The update map is treated as a $set operation (field-level updates).
     * Returns { matchedCount, modifiedCount, acknowledged }.
     */
    public Map<String, Object> updateOne(String collectionName,
                                          Map<String, Object> filter,
                                          Map<String, Object> updateFields) {
        log.debug("[ScriptMongoProxy:{}] updateOne on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);

        // Build $set update from the provided fields map
        Bson update = Updates.combine(
                updateFields.entrySet().stream()
                        .map(e -> Updates.set(e.getKey(), e.getValue()))
                        .toList()
        );

        UpdateResult result = coll.updateOne(toBson(filter), update);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("acknowledged", result.wasAcknowledged());
        response.put("matchedCount", result.getMatchedCount());
        response.put("modifiedCount", result.getModifiedCount());
        return response;
    }

    /** Delete the first document matching the filter. Returns { deletedCount, acknowledged }. */
    public Map<String, Object> deleteOne(String collectionName, Map<String, Object> filter) {
        log.debug("[ScriptMongoProxy:{}] deleteOne on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);
        DeleteResult result = coll.deleteOne(toBson(filter));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("acknowledged", result.wasAcknowledged());
        response.put("deletedCount", result.getDeletedCount());
        return response;
    }

    /** Count documents matching the filter. */
    public long count(String collectionName, Map<String, Object> filter) {
        log.debug("[ScriptMongoProxy:{}] count on '{}'", name, collectionName);
        MongoCollection<Document> coll = database.getCollection(collectionName);
        return filter == null || filter.isEmpty()
                ? coll.estimatedDocumentCount()
                : coll.countDocuments(toBson(filter));
    }

    // ─── AutoCloseable ────────────────────────────────────────────────────────

    @Override
    public void close() {
        try {
            client.close();
            log.debug("[ScriptMongoProxy:{}] Connection closed", name);
        } catch (Exception e) {
            log.warn("[ScriptMongoProxy:{}] Error closing connection: {}", name, e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Convert a Map to a MongoDB BSON filter document. */
    private Bson toBson(Map<String, Object> filter) {
        if (filter == null || filter.isEmpty()) {
            return new Document();
        }
        Document doc = new Document();
        filter.forEach(doc::append);
        return doc;
    }

    /**
     * Convert a MongoDB Document to a plain Java Map.
     * Converts ObjectId to hex string so Groovy scripts can use it easily.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> documentToMap(Document doc) {
        Map<String, Object> result = new LinkedHashMap<>();
        doc.forEach((k, v) -> {
            if (v instanceof org.bson.types.ObjectId oid) {
                result.put(k, oid.toHexString());
            } else if (v instanceof Document inner) {
                result.put(k, documentToMap(inner));
            } else if (v instanceof List<?> list) {
                result.put(k, list.stream()
                        .map(item -> item instanceof Document d ? documentToMap(d) : item)
                        .toList());
            } else {
                result.put(k, v);
            }
        });
        return result;
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
