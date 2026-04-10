package com.flowforge.workflow.dto;

import java.util.Map;
import java.util.Objects;

public class ModelRecordRequest {

    private String dataModelId;
    private String name;
    private Map<String, Object> data;

    public ModelRecordRequest() {
    }

    public ModelRecordRequest(String dataModelId, String name, Map<String, Object> data) {
        this.dataModelId = dataModelId;
        this.name = name;
        this.data = data;
    }

    public String getDataModelId() { return dataModelId; }
    public void setDataModelId(String dataModelId) { this.dataModelId = dataModelId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ModelRecordRequest that = (ModelRecordRequest) o;
        return Objects.equals(dataModelId, that.dataModelId) &&
                Objects.equals(name, that.name) &&
                Objects.equals(data, that.data);
    }

    @Override
    public int hashCode() {
        return Objects.hash(dataModelId, name, data);
    }

    @Override
    public String toString() {
        return "ModelRecordRequest{dataModelId='" + dataModelId + "', name='" + name + "'}";
    }
}
