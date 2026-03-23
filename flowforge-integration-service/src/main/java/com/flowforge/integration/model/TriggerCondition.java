package com.flowforge.integration.model;

import java.util.List;
import java.util.Objects;

/**
 * A structured condition that determines whether an incoming Kafka event
 * should fire a workflow trigger.
 *
 * Condition types:
 *   ALWAYS           — always fire (no check)
 *   FIELD_EXISTS     — event JSON has the field at fieldPath
 *   FIELD_NOT_EXISTS — event JSON does NOT have the field at fieldPath
 *   FIELD_EQUALS     — event[fieldPath] == expectedValue
 *   FIELD_NOT_EQUALS — event[fieldPath] != expectedValue
 *   FIELD_CONTAINS   — event[fieldPath] contains expectedValue (string contains)
 *   FIELD_MATCHES    — event[fieldPath] matches expectedValue as a regex
 *   FIELD_GT         — event[fieldPath] > expectedValue (numeric)
 *   FIELD_LT         — event[fieldPath] < expectedValue (numeric)
 *   SPEL_EXPRESSION  — evaluate a raw SpEL expression (legacy)
 *   AND              — all nestedConditions must pass
 *   OR               — at least one nestedCondition must pass
 *   NOT              — nestedConditions[0] must NOT pass
 */
public class TriggerCondition {

    /** Condition type — one of the values listed above */
    private String conditionType;

    /**
     * JSON path to the field being tested.
     * Supports dot notation: "data.order.status"
     * or JSON Pointer: "/data/order/status"
     */
    private String fieldPath;

    /** Expected value for equality / contains / regex checks */
    private String expectedValue;

    /** For AND / OR / NOT — list of nested sub-conditions */
    private List<TriggerCondition> nestedConditions;

    /** For SPEL_EXPRESSION — the raw SpEL string */
    private String spelExpression;

    /** Human-readable label shown in the UI */
    private String label;

    public TriggerCondition() {}

    public TriggerCondition(String conditionType, String fieldPath, String expectedValue,
                             List<TriggerCondition> nestedConditions, String spelExpression, String label) {
        this.conditionType = conditionType;
        this.fieldPath = fieldPath;
        this.expectedValue = expectedValue;
        this.nestedConditions = nestedConditions;
        this.spelExpression = spelExpression;
        this.label = label;
    }

    public String getConditionType() { return conditionType; }
    public void setConditionType(String conditionType) { this.conditionType = conditionType; }
    public String getFieldPath() { return fieldPath; }
    public void setFieldPath(String fieldPath) { this.fieldPath = fieldPath; }
    public String getExpectedValue() { return expectedValue; }
    public void setExpectedValue(String expectedValue) { this.expectedValue = expectedValue; }
    public List<TriggerCondition> getNestedConditions() { return nestedConditions; }
    public void setNestedConditions(List<TriggerCondition> nestedConditions) { this.nestedConditions = nestedConditions; }
    public String getSpelExpression() { return spelExpression; }
    public void setSpelExpression(String spelExpression) { this.spelExpression = spelExpression; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    @Override
    public String toString() {
        return "TriggerCondition{type=" + conditionType + ", field=" + fieldPath + ", expected=" + expectedValue + "}";
    }

    public static Builder builder() { return new Builder(); }
    public static class Builder {
        private String conditionType, fieldPath, expectedValue, spelExpression, label;
        private List<TriggerCondition> nestedConditions;
        public Builder conditionType(String v) { conditionType=v; return this; }
        public Builder fieldPath(String v) { fieldPath=v; return this; }
        public Builder expectedValue(String v) { expectedValue=v; return this; }
        public Builder nestedConditions(List<TriggerCondition> v) { nestedConditions=v; return this; }
        public Builder spelExpression(String v) { spelExpression=v; return this; }
        public Builder label(String v) { label=v; return this; }
        public TriggerCondition build() {
            return new TriggerCondition(conditionType,fieldPath,expectedValue,nestedConditions,spelExpression,label);
        }
    }
}
