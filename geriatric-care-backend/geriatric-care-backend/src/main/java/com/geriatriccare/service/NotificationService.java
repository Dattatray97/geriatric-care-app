package com.geriatriccare.service;

import com.geriatriccare.model.Patient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;


import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;


/**
 * Service for sending emergency email and SMS notifications to patient emergency contacts.
 * The email is sent FROM the Caretaker Gmail (configured as Hospital Email)
 * TO the patient emergency contact email stored in the patient profile.
 * SMS is sent via Fast2SMS (Indian SMS gateway) to the patient emergency contact phone number.
 */
@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${hospital.email.from-name:ElderGuard Nexus Care Center}")
    private String hospitalName;

    // Fast2SMS Configuration (Indian SMS Gateway)
    // Sign up at https://www.fast2sms.com, recharge ₹100, get API key from Dev API section
    @Value("${fast2sms.api-key:NOT_SET}")
    private String fast2smsApiKey;

    @Value("${fast2sms.enabled:false}")
    private boolean fast2smsEnabled;

    private boolean smsInitialized = false;

    private static final String FAST2SMS_API_URL = "https://www.fast2sms.com/dev/bulkV2";

    /**
     * Validate Fast2SMS configuration on startup.
     */
    @PostConstruct
    public void initSms() {
        if (fast2smsEnabled && !"NOT_SET".equals(fast2smsApiKey)) {
            smsInitialized = true;
            logger.info("Fast2SMS service initialized successfully. REAL SMS notifications are ENABLED.");
        } else {
            logger.warn("Fast2SMS is NOT configured. Set fast2sms.api-key in application.yml to enable SMS.");
        }
    }

    /**
     * Sends an emergency SMS notification to the patient emergency contact phone number.
     * SMS is sent via Fast2SMS (Indian SMS gateway) to any Indian mobile number.
     * Requires ₹100 minimum recharge on Fast2SMS account.
     */
    public Map<String, Object> sendEmergencySMS(Patient patient, String alertId) {
        Map<String, Object> result = new HashMap<>();
        String contactPhone = patient.getEmergencyContactPhone();
        String contactName = patient.getEmergencyContactName();

        if (contactPhone == null || contactPhone.isBlank()) {
            result.put("smsSent", false);
            result.put("smsError", "No emergency contact phone number configured for this patient. Please add phone number in patient profile.");
            logger.warn("Cannot send emergency SMS for patient {}: No phone number configured", patient.getName());
            return result;
        }

        if (!smsInitialized) {
            result.put("smsSent", false);
            result.put("smsError", "Fast2SMS service is not configured. Please set fast2sms.api-key in application.yml");
            logger.warn("Cannot send SMS: Fast2SMS not initialized");
            return result;
        }

        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
            String smsBody = buildSmsBody(patient, contactName, alertId, timestamp);

            // Extract bare 10-digit number (Fast2SMS needs just digits, no +91)
            String bareNumber = extractIndianNumber(contactPhone);
            logger.info("Sending REAL SMS via Fast2SMS to: {} (bare: {}) for patient {}", contactPhone, bareNumber, patient.getName());

            // Send SMS via Fast2SMS REST API using modern Java 11 HttpClient
            String encodedMessage = java.net.URLEncoder.encode(smsBody, "UTF-8");
            String postData = "message=" + encodedMessage
                    + "&language=english"
                    + "&route=q"
                    + "&numbers=" + bareNumber;

            java.net.http.HttpRequest httpRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(FAST2SMS_API_URL))
                    .header("authorization", fast2smsApiKey.trim()) // trim to remove any invisible newlines
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("cache-control", "no-cache")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(postData))
                    .build();

            java.net.http.HttpResponse<String> httpResponse = java.net.http.HttpClient.newHttpClient()
                    .send(httpRequest, java.net.http.HttpResponse.BodyHandlers.ofString());

            int responseCode = httpResponse.statusCode();
            String responseBody = httpResponse.body();
            
            logger.info("Fast2SMS response (HTTP {}): {}", responseCode, responseBody);

            if (responseCode >= 200 && responseCode < 300 && responseBody != null && responseBody.contains("\"return\":true")) {
                result.put("smsSent", true);
                result.put("smsRecipient", contactPhone);
                result.put("smsContactName", contactName != null ? contactName : "Emergency Contact");
                result.put("smsSentFrom", "Fast2SMS");
                result.put("smsTimestamp", timestamp);
                result.put("smsStatus", "delivered");
                logger.info("REAL SMS sent successfully via Fast2SMS TO {} ({}) for patient {}",
                        contactName, bareNumber, patient.getName());
            } else {
                result.put("smsSent", false);
                result.put("smsError", "SMS gateway returned error: " + responseBody);
                logger.error("Fast2SMS returned error for patient {}: {}", patient.getName(), responseBody);
            }

        } catch (Exception e) {
            result.put("smsSent", false);
            result.put("smsError", "Failed to send SMS: " + e.getMessage());
            logger.error("Failed to send emergency SMS to {} for patient {}: {}",
                    contactPhone, patient.getName(), e.getMessage());
        }

        return result;
    }

    /**
     * Extracts a bare 10-digit Indian mobile number from any format.
     * Handles: "+917899625802" -> "7899625802"
     *          "917899625802"  -> "7899625802"
     *          "07899625802"   -> "7899625802"
     *          "7899625802"    -> "7899625802"
     *          "+9865741236"   -> "9865741236"
     */
    private String extractIndianNumber(String phone) {
        if (phone == null || phone.isBlank()) return phone;

        // Remove all non-digit characters
        String digits = phone.replaceAll("[^0-9]", "");

        // If starts with 91 and is 12 digits, strip country code
        if (digits.startsWith("91") && digits.length() == 12) {
            return digits.substring(2);
        }

        // If starts with 0 and is 11 digits, strip leading 0
        if (digits.startsWith("0") && digits.length() == 11) {
            return digits.substring(1);
        }

        // If already 10 digits, return as-is
        if (digits.length() == 10) {
            return digits;
        }

        // Fallback: return last 10 digits
        if (digits.length() > 10) {
            return digits.substring(digits.length() - 10);
        }

        return digits;
    }

    /**
     * Builds a concise SMS message body for emergency notification.
     */
    private String buildSmsBody(Patient patient, String contactName, String alertId, String timestamp) {
        String safeName = contactName != null ? contactName : "Emergency Contact";
        String patientName = patient.getName();
        String room = patient.getRoom() != null ? patient.getRoom() : "N/A";
        String status = patient.getStatus() != null ? patient.getStatus() : "Unknown";

        return String.format(
            "EMERGENCY SOS ALERT! Dear %s, Emergency SOS activated for patient %s (Room: %s, Status: %s) at %s. Alert ID: %s. Medical team dispatched immediately. Contact facility now. - %s",
            safeName, patientName, room, status, timestamp, alertId, hospitalName
        );
    }

    /**
     * Sends an emergency email notification to the patient emergency contact.
     * Email is sent FROM the caretaker configured Gmail (as Hospital Email)
     * TO the patient emergencyContactEmail.
     *
     * @param patient The patient for whom the emergency was triggered
     * @param alertId The unique emergency alert ID
     * @return Map containing notification status details
     */
    public Map<String, Object> sendEmergencyEmail(Patient patient, String alertId) {
        Map<String, Object> result = new HashMap<>();
        String contactEmail = patient.getEmergencyContactEmail();
        String contactName = patient.getEmergencyContactName();

        if (contactEmail == null || contactEmail.isBlank()) {
            result.put("emailSent", false);
            result.put("emailError", "No emergency contact email configured for this patient. Please add email in patient profile.");
            logger.warn("Cannot send emergency email for patient {}: No email configured", patient.getName());
            return result;
        }

        try {
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            // FROM: Caretaker email with Hospital name branding
            String fromEmail = (senderEmail != null) ? senderEmail : "";
            String fromName = (hospitalName != null) ? hospitalName : "ElderGuard Nexus Care Center";
            helper.setFrom(fromEmail, fromName);
            // TO: Patient emergency contact email
            helper.setTo(contactEmail);
            // Subject
            helper.setSubject("EMERGENCY ALERT - " + patient.getName() + " - " + hospitalName);
            // Body: Professional HTML email
            String emailBody = buildEmailBody(patient, contactName, alertId, timestamp);
            helper.setText((emailBody != null) ? emailBody : "", true);

            mailSender.send(mimeMessage);

            result.put("emailSent", true);
            result.put("emailRecipient", contactEmail);
            result.put("emailContactName", contactName != null ? contactName : "Emergency Contact");
            result.put("emailSentFrom", senderEmail);
            result.put("emailTimestamp", timestamp);
            logger.info("Emergency email sent successfully FROM {} TO {} ({}) for patient {}",
                    senderEmail, contactName, contactEmail, patient.getName());

        } catch (Exception e) {
            result.put("emailSent", false);
            result.put("emailError", "Failed to send email: " + e.getMessage());
            logger.error("Failed to send emergency email to {} for patient {}: {}",
                    contactEmail, patient.getName(), e.getMessage());
        }

        return result;
    }

    /**
     * Builds a beautiful, professional HTML email body for emergency notification.
     */
    private String buildEmailBody(Patient patient, String contactName, String alertId, String timestamp) {
        String safeName = contactName != null ? contactName : "Emergency Contact";
        String patientName = patient.getName();
        String room = patient.getRoom() != null ? patient.getRoom() : "N/A";
        String age = patient.getAge() != null ? patient.getAge().toString() + " years" : "N/A";
        String bloodType = patient.getBloodType() != null ? patient.getBloodType() : "Unknown";
        String status = patient.getStatus() != null ? patient.getStatus() : "Unknown";
        String conditions = patient.getConditions() != null ? patient.getConditions() : "None recorded";
        String allergies = patient.getAllergies() != null ? patient.getAllergies() : "None known";

        // Determine status color
        String statusColor = "#10b981";
        if ("CRITICAL".equalsIgnoreCase(status)) {
            statusColor = "#dc2626";
        } else if ("ATTENTION".equalsIgnoreCase(status)) {
            statusColor = "#f59e0b";
        }

        StringBuilder sb = new StringBuilder();

        // Outer wrapper - full width background
        sb.append("<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;padding:0;background:#f1f5f9;'>");
        sb.append("<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='background:#f1f5f9;padding:30px 0;'>");
        sb.append("<tr><td align='center'>");
        sb.append("<table role='presentation' width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>");

        // === TOP RED EMERGENCY BANNER ===
        sb.append("<tr><td style='background:linear-gradient(135deg,#b91c1c,#dc2626,#ef4444);padding:40px 30px;text-align:center;border-radius:16px 16px 0 0;'>");
        sb.append("<table role='presentation' width='100%' cellpadding='0' cellspacing='0'>");
        // Warning icon circle
        sb.append("<tr><td align='center' style='padding-bottom:16px;'>");
        sb.append("<div style='width:72px;height:72px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-block;line-height:72px;font-size:36px;border:3px solid rgba(255,255,255,0.4);'>&#9888;</div>");
        sb.append("</td></tr>");
        // Title
        sb.append("<tr><td align='center'>");
        sb.append("<h1 style='color:#ffffff;margin:0;font-size:28px;font-weight:800;letter-spacing:2px;text-transform:uppercase;'>Emergency SOS Alert</h1>");
        sb.append("</td></tr>");
        // Subtitle
        sb.append("<tr><td align='center' style='padding-top:8px;'>");
        sb.append("<p style='color:rgba(255,255,255,0.85);margin:0;font-size:14px;font-weight:500;'>").append(hospitalName).append("</p>");
        sb.append("</td></tr>");
        // Alert ID badge
        sb.append("<tr><td align='center' style='padding-top:14px;'>");
        sb.append("<span style='display:inline-block;background:rgba(255,255,255,0.2);color:#fff;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:1px;border:1px solid rgba(255,255,255,0.3);'>Alert ID: ").append(alertId).append("</span>");
        sb.append("</td></tr>");
        sb.append("</table></td></tr>");

        // === TIME STRIP ===
        sb.append("<tr><td style='background:#991b1b;padding:12px 30px;text-align:center;'>");
        sb.append("<p style='color:rgba(255,255,255,0.9);margin:0;font-size:13px;font-weight:600;'>Alert Triggered: ").append(timestamp).append("</p>");
        sb.append("</td></tr>");

        // === WHITE BODY SECTION ===
        sb.append("<tr><td style='background:#ffffff;padding:36px 32px;'>");

        // Greeting
        sb.append("<p style='font-family:Georgia,serif;font-size:18px;color:#1e293b;margin:0 0 6px;'>Dear <strong>").append(safeName).append("</strong>,</p>");
        sb.append("<p style='font-size:15px;color:#475569;line-height:1.7;margin:0 0 28px;'>");
        sb.append("We are writing to inform you that an <strong style='color:#dc2626;'>Emergency SOS</strong> has been activated for your loved one, <strong style='color:#1e293b;'>").append(patientName).append("</strong>. ");
        sb.append("Our medical team has been immediately dispatched and emergency protocols are now active.</p>");

        // === PATIENT INFO CARD ===
        sb.append("<div style='border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;'>");
        // Card header
        sb.append("<div style='background:linear-gradient(135deg,#1e293b,#334155);padding:14px 20px;'>");
        sb.append("<h3 style='color:#ffffff;margin:0;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;'>&#128100; Patient Information</h3>");
        sb.append("</div>");
        // Card body
        sb.append("<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='font-size:14px;'>");
        sb.append(buildInfoRow("Patient Name", patientName, false, "#1e293b"));
        sb.append(buildInfoRow("Room / Location", room, true, "#1e293b"));
        sb.append(buildInfoRow("Age", age, false, "#1e293b"));
        sb.append(buildInfoRow("Blood Type", bloodType, true, "#1e293b"));
        sb.append(buildInfoRow("Current Status", status, false, statusColor));
        sb.append(buildInfoRow("Medical Conditions", conditions, true, "#1e293b"));
        sb.append(buildInfoRow("Known Allergies", allergies, false, "#dc2626"));
        sb.append("</table></div>");

        // === ALERT DETAILS CARD ===
        sb.append("<div style='border:2px solid #fecaca;border-radius:12px;overflow:hidden;margin-bottom:24px;'>");
        // Card header - red
        sb.append("<div style='background:linear-gradient(135deg,#dc2626,#ef4444);padding:14px 20px;'>");
        sb.append("<h3 style='color:#ffffff;margin:0;font-size:14px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;'>&#9888; Alert Details</h3>");
        sb.append("</div>");
        sb.append("<table role='presentation' width='100%' cellpadding='0' cellspacing='0' style='font-size:14px;'>");
        sb.append(buildInfoRow("Alert ID", alertId, false, "#991b1b"));
        sb.append(buildInfoRow("Triggered At", timestamp, true, "#1e293b"));
        sb.append(buildInfoRow("Alert Type", "Manual SOS - Emergency Assistance", false, "#dc2626"));
        sb.append(buildInfoRow("Location", "Patient Room - " + room, true, "#1e293b"));
        sb.append("</table></div>");

        // === RED CALL-TO-ACTION BOX ===
        sb.append("<div style='background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;'>");
        sb.append("<p style='color:rgba(255,255,255,0.9);margin:0 0 6px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;'>Immediate Action Required</p>");
        sb.append("<h2 style='color:#ffffff;margin:0 0 10px;font-size:22px;font-weight:800;'>Contact The Facility Now</h2>");
        sb.append("<div style='display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);border-radius:10px;padding:12px 28px;margin-top:4px;'>");
        sb.append("<p style='color:#ffffff;margin:0;font-size:22px;font-weight:800;letter-spacing:1px;'>&#9742; +1 (555) 019-8234</p>");
        sb.append("</div>");
        sb.append("<p style='color:rgba(255,255,255,0.8);margin:10px 0 0;font-size:13px;'>").append(hospitalName).append("</p>");
        sb.append("</div>");

        // === REASSURANCE TEXT ===
        sb.append("<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;'>");
        sb.append("<h4 style='color:#166534;margin:0 0 8px;font-size:14px;'>&#9989; What We Are Doing</h4>");
        sb.append("<ul style='color:#15803d;font-size:13px;line-height:2;margin:0;padding-left:18px;'>");
        sb.append("<li>Medical staff dispatched to <strong>").append(patientName).append("</strong> immediately</li>");
        sb.append("<li>Emergency protocols activated at the facility</li>");
        sb.append("<li>Vital signs are being monitored continuously</li>");
        sb.append("<li>A care team member will contact you shortly with updates</li>");
        sb.append("</ul></div>");

        // Signature line
        sb.append("<p style='font-size:14px;color:#64748b;line-height:1.6;margin:0 0 8px;'>Please do not hesitate to reach out if you have any questions or concerns.</p>");
        sb.append("<p style='font-size:14px;color:#1e293b;margin:0;'>Warm regards,<br><strong style='color:#dc2626;'>").append(hospitalName).append("</strong><br>");
        sb.append("<span style='font-size:12px;color:#94a3b8;'>Emergency Notification System</span></p>");

        sb.append("</td></tr>");

        // === DARK FOOTER ===
        sb.append("<tr><td style='background:linear-gradient(135deg,#0f172a,#1e293b);padding:28px 32px;text-align:center;border-radius:0 0 16px 16px;'>");
        sb.append("<p style='color:#e2e8f0;margin:0 0 6px;font-size:11px;'>This is an automated emergency notification</p>");
        sb.append("<p style='color:#ffffff;margin:0 0 10px;font-size:15px;font-weight:700;'>&#127973; ").append(hospitalName).append("</p>");
        sb.append("<div style='width:60px;height:2px;background:linear-gradient(90deg,#dc2626,#f59e0b);margin:0 auto 10px;border-radius:1px;'></div>");
        sb.append("<p style='color:#cbd5e1;margin:0;font-size:11px;letter-spacing:0.5px;'>ElderGuard Nexus - Geriatric Care Platform | HIPAA Compliant<br>Do not reply to this email. For assistance, call the facility number above.</p>");
        sb.append("</td></tr>");

        // Close wrapper tables
        sb.append("</table></td></tr></table>");
        sb.append("</body></html>");

        return sb.toString();
    }

    /**
     * Helper method to build a styled table row for info cards.
     */
    private String buildInfoRow(String label, String value, boolean shaded, String valueColor) {
        String bg = shaded ? "background:#f8fafc;" : "";
        return "<tr style='" + bg + "'>"
            + "<td style='padding:12px 20px;color:#64748b;font-weight:500;width:40%;border-bottom:1px solid #f1f5f9;'>" + label + "</td>"
            + "<td style='padding:12px 20px;color:" + valueColor + ";font-weight:700;border-bottom:1px solid #f1f5f9;'>" + value + "</td>"
            + "</tr>";
    }
}
