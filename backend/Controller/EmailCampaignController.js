const emailService = require('../utils/emailCampaignService');
const EmailContact = require('../models/EmailContact');
const EmailHistory = require('../models/EmailHistory');
const SmtpProfile = require('../models/SmtpProfile');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class EmailCampaignController {
    /**
     * Send campaign with background processing
     */
    async sendCampaign(req, res) {
        try {
            const { subject, htmlTemplate, recipientsJson, smtpProfileId } = req.body;
            let recipientsData = [];
            
            try {
                recipientsData = JSON.parse(recipientsJson);
            } catch (err) {
                return res.status(400).json({ success: false, message: "Invalid recipients JSON format" });
            }

            if (!recipientsData || recipientsData.length === 0) {
                return res.status(400).json({ success: false, message: "At least one recipient is required." });
            }

            // Process attachments if any
            const processedAttachments = [];
            if (req.files && req.files.length > 0) {
                const uploadDir = path.resolve('uploads/email-attachments');
                req.files.forEach(file => {
                    const filePath = path.resolve(file.path);
                    if (filePath.startsWith(uploadDir)) {
                        processedAttachments.push({
                            content: fs.readFileSync(filePath),
                            filename: file.originalname
                        });
                    }
                });
            }

            // Initial historical entry
            const historyEntry = new EmailHistory({
                subject,
                sender: req.user.id,
                recipientCount: recipientsData.length,
                status: 'running'
            });
            await historyEntry.save();

            // Background task: send all emails and update history
            // In Node.js, we just let it run (async). In a real production system, use BullMQ/Redis.
            const runInBackground = async () => {
                const results = await emailService.sendCampaign({
                    recipients: recipientsData,
                    subject,
                    htmlTemplate,
                    attachments: processedAttachments,
                    smtpProfileId // Pass the ID
                });

                historyEntry.sentCount = results.sent;
                historyEntry.failedCount = results.failed;
                historyEntry.skippedCount = results.skipped;
                historyEntry.errorLogs = results.errors;
                historyEntry.status = results.failed === 0 ? 'completed' : 'partial';
                await historyEntry.save();
                
                // Optional message in console
                console.log(`Campaign "${subject}" complete: sent=${results.sent}, failed=${results.failed}`);
            };

            // Non-blocking call
            runInBackground();

            res.status(200).json({
                success: true,
                message: "Campaign started successfully in background.",
                historyId: historyEntry._id
            });
        } catch (error) {
            console.error("Error in sendCampaign:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Contact management methods
     */
    async listContacts(req, res) {
        try {
            const contacts = await EmailContact.find().sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: contacts });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listAllProjectEmails(req, res) {
        try {
            const users = await User.find({ email: { $exists: true } }, 'name email role department service isActive').sort({ name: 1 });
            const formattedUsers = users.map(u => {
                const roleLabel = u.role ? (u.role.charAt(0).toUpperCase() + u.role.slice(1)) : 'No Role';
                return {
                    _id: u._id,
                    name: u.name,
                    email: u.email,
                    role: roleLabel,
                    department: u.department || '',
                    service: u.service || '',
                    category: `System (${roleLabel})`,
                    status: u.isActive ? 'ACTIVE' : 'INACTIVE'
                };
            });
            res.status(200).json({ success: true, data: formattedUsers });
        } catch (error) {
            console.error("Error listing project emails:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createContact(req, res) {
        try {
            const { name, email, category } = req.body;
            const existing = await EmailContact.findOne({ email });
            if (existing) {
                return res.status(400).json({ success: false, message: "Contact already exists with this email." });
            }
            const contact = new EmailContact({ name, email, category });
            await contact.save();
            res.status(201).json({ success: true, data: contact });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteContact(req, res) {
        try {
            const { id } = req.params;
            await EmailContact.findByIdAndDelete(id);
            res.status(200).json({ success: true, message: "Contact deleted successfully." });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async listHistory(req, res) {
        try {
            const history = await EmailHistory.find().sort({ createdAt: -1 }).populate('sender', 'name email');
            res.status(200).json({ success: true, data: history });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async testConnection(req, res) {
        const result = await emailService.testConnection();
        if (!result.ok) {
            return res.status(502).json({ success: false, message: result.message });
        }
        res.status(200).json(result);
    }

    async getTemplate(req, res) {
        const template = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px; }
    .container { max-width:600px; margin:auto; background:#fff; border-radius:8px;
                  padding:32px; box-shadow:0 2px 8px rgba(0,0,0,.08); }
    h2 { color:#1a1a2e; }
    p  { color:#444; line-height:1.6; }
    .footer { margin-top:32px; font-size:12px; color:#999; text-align:center; }
    a  { color:#6366f1; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Dear {{name}},</h2>
    <p>You are cordially invited to our upcoming event at the institute.</p>
    <p>We look forward to your participation.</p>
    <div class="footer">
      <p>To unsubscribe from future emails,
        <a href="{{unsubscribe_link}}">click here</a>.
      </p>
    </div>
  </div>
</body>
</html>`;
        res.status(200).json({ success: true, template });
    }

    /**
     * SMTP Profile management
     */
    async listSmtpProfiles(req, res) {
        try {
            const profiles = await SmtpProfile.find().sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: profiles });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async createSmtpProfile(req, res) {
        try {
            const { displayName, fromEmail, smtpHost, port, username, password } = req.body;
            const profile = new SmtpProfile({ displayName, fromEmail, smtpHost, port, username, password });
            await profile.save();
            res.status(201).json({ success: true, data: profile });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async deleteSmtpProfile(req, res) {
        try {
            const { id } = req.params;
            await SmtpProfile.findByIdAndDelete(id);
            res.status(200).json({ success: true, message: "SMTP profile deleted successfully." });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new EmailCampaignController();
