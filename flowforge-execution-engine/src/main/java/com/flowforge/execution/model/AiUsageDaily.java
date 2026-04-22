package com.flowforge.execution.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document("ai_usage_daily")
@CompoundIndexes({
        @CompoundIndex(name = "clientId_date_unique", def = "{'clientId': 1, 'date': 1}", unique = true)
})
public class AiUsageDaily {

    @Id
    private String id;

    @Indexed
    private String clientId;

    private LocalDate date;
    private int messages;
    private Instant updatedAt;

    public AiUsageDaily() {
    }

    public AiUsageDaily(String id, String clientId, LocalDate date, int messages, Instant updatedAt) {
        this.id = id;
        this.clientId = clientId;
        this.date = date;
        this.messages = messages;
        this.updatedAt = updatedAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public int getMessages() { return messages; }
    public void setMessages(int messages) { this.messages = messages; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
