package com.phantom.cat.model;

public class Catm {

    private String from;
    private String to;
    private String content;
    private String reply;
    private boolean temp;
    private long seentime;
    private String status;
    private long timestamp;

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
    public String getReply() {
        return reply;
    }
    public void setReply(String reply) {
        this.reply = reply;
    }
    public boolean isTemp() {
        return temp;
    }
    public void setTemp(boolean temp) {
        this.temp = temp;
    }

    public long getSeenTime() {
         return seentime;
    }
    public void setSeenTime(long seenTime) {
        this.seentime = seenTime;
    }
    public long getTimeStamp() {
        return timestamp;
    }
    public  void setTimeStamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }

}