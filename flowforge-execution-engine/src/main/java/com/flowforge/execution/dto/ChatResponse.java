package com.flowforge.execution.dto;

import java.util.ArrayList;
import java.util.List;

public class ChatResponse {

    private String answer;
    private List<ChatCitation> citations = new ArrayList<>();
    private int usedToday;
    private int limitPerDay;

    public ChatResponse() {
    }

    public ChatResponse(String answer, List<ChatCitation> citations, int usedToday, int limitPerDay) {
        this.answer = answer;
        this.citations = citations != null ? citations : new ArrayList<>();
        this.usedToday = usedToday;
        this.limitPerDay = limitPerDay;
    }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public List<ChatCitation> getCitations() {
        if (citations == null) citations = new ArrayList<>();
        return citations;
    }
    public void setCitations(List<ChatCitation> citations) { this.citations = citations; }

    public int getUsedToday() { return usedToday; }
    public void setUsedToday(int usedToday) { this.usedToday = usedToday; }

    public int getLimitPerDay() { return limitPerDay; }
    public void setLimitPerDay(int limitPerDay) { this.limitPerDay = limitPerDay; }
}
