package com.flowforge.client.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${app.invitation-expiry-hours:72}")
    private int invitationExpiryHours;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendInvitationEmail(String toEmail, String orgName, String inviterName, String inviteToken) {
        try {
            String inviteUrl = baseUrl + "/invite/" + inviteToken;
            String html = buildInvitationHtml(orgName, inviterName, inviteUrl);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("You've been invited to join " + orgName + " on FlowForge");
            helper.setText(html, true);
            helper.setFrom("noreply@flowforge.io");

            mailSender.send(message);
            log.info("Invitation email sent to {} for org {}", toEmail, orgName);
        } catch (MessagingException e) {
            log.warn("Failed to send invitation email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendWelcomeEmail(String toEmail, String orgName, String userName) {
        try {
            String html = buildWelcomeHtml(orgName, userName);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Welcome to " + orgName + " on FlowForge!");
            helper.setText(html, true);
            helper.setFrom("noreply@flowforge.io");

            mailSender.send(message);
            log.info("Welcome email sent to {} for org {}", toEmail, orgName);
        } catch (MessagingException e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        }
    }

    public int getInvitationExpiryHours() {
        return invitationExpiryHours;
    }

    private String buildInvitationHtml(String orgName, String inviterName, String inviteUrl) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head><meta charset=\"UTF-8\"></head>" +
                "<body style=\"margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;\">" +
                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f4f7fa;padding:40px 0;\">" +
                "<tr><td align=\"center\">" +
                "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);\">" +
                "<tr><td style=\"background-color:#4f46e5;padding:30px 40px;border-radius:8px 8px 0 0;\">" +
                "<h1 style=\"color:#ffffff;margin:0;font-size:24px;\">FlowForge</h1>" +
                "</td></tr>" +
                "<tr><td style=\"padding:40px;\">" +
                "<h2 style=\"color:#1f2937;margin:0 0 16px 0;\">You're invited!</h2>" +
                "<p style=\"color:#4b5563;font-size:16px;line-height:1.6;\">" +
                "<strong>" + escapeHtml(inviterName) + "</strong> has invited you to join " +
                "<strong>" + escapeHtml(orgName) + "</strong> on FlowForge.</p>" +
                "<p style=\"color:#4b5563;font-size:16px;line-height:1.6;\">" +
                "Click the button below to accept the invitation and set up your account. " +
                "This invitation expires in " + invitationExpiryHours + " hours.</p>" +
                "<div style=\"text-align:center;margin:32px 0;\">" +
                "<a href=\"" + inviteUrl + "\" style=\"display:inline-block;background-color:#4f46e5;color:#ffffff;" +
                "text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;\">" +
                "Accept Invitation</a></div>" +
                "<p style=\"color:#9ca3af;font-size:14px;line-height:1.6;\">If the button doesn't work, copy and paste this link into your browser:</p>" +
                "<p style=\"color:#4f46e5;font-size:14px;word-break:break-all;\">" + inviteUrl + "</p>" +
                "</td></tr>" +
                "<tr><td style=\"background-color:#f9fafb;padding:24px 40px;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;\">" +
                "<p style=\"color:#9ca3af;font-size:12px;margin:0;text-align:center;\">" +
                "This is an automated message from FlowForge. If you did not expect this invitation, you can safely ignore this email.</p>" +
                "</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    private String buildWelcomeHtml(String orgName, String userName) {
        String loginUrl = baseUrl + "/login";
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head><meta charset=\"UTF-8\"></head>" +
                "<body style=\"margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f7fa;\">" +
                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#f4f7fa;padding:40px 0;\">" +
                "<tr><td align=\"center\">" +
                "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);\">" +
                "<tr><td style=\"background-color:#4f46e5;padding:30px 40px;border-radius:8px 8px 0 0;\">" +
                "<h1 style=\"color:#ffffff;margin:0;font-size:24px;\">FlowForge</h1>" +
                "</td></tr>" +
                "<tr><td style=\"padding:40px;\">" +
                "<h2 style=\"color:#1f2937;margin:0 0 16px 0;\">Welcome to " + escapeHtml(orgName) + "!</h2>" +
                "<p style=\"color:#4b5563;font-size:16px;line-height:1.6;\">" +
                "Hi <strong>" + escapeHtml(userName) + "</strong>, your account has been set up successfully. " +
                "You're now part of the <strong>" + escapeHtml(orgName) + "</strong> team on FlowForge.</p>" +
                "<p style=\"color:#4b5563;font-size:16px;line-height:1.6;\">You can now log in and start building workflows.</p>" +
                "<div style=\"text-align:center;margin:32px 0;\">" +
                "<a href=\"" + loginUrl + "\" style=\"display:inline-block;background-color:#4f46e5;color:#ffffff;" +
                "text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;\">" +
                "Go to FlowForge</a></div>" +
                "</td></tr>" +
                "<tr><td style=\"background-color:#f9fafb;padding:24px 40px;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;\">" +
                "<p style=\"color:#9ca3af;font-size:12px;margin:0;text-align:center;\">" +
                "This is an automated message from FlowForge.</p>" +
                "</td></tr>" +
                "</table></td></tr></table></body></html>";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
