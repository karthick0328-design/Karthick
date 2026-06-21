const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const SmtpProfile = require('../models/SmtpProfile');

class EmailCampaignService {
    constructor() {
        this.transporter = null;
        this.fromEmail = process.env.SMTP_FROM_EMAIL || process.env.EMAIL_USER;
        this.unsubBaseUrl = process.env.FRONTEND_URL + "/unsubscribe";
    }

    async _getTransporter(smtpProfileId = null) {
        // If a profile ID is provided, fetch it and return a custom transporter
        if (smtpProfileId && smtpProfileId !== 'default') {
            const profile = await SmtpProfile.findById(smtpProfileId);
            if (profile) {
                return {
                    transporter: nodemailer.createTransport({
                        host: profile.smtpHost,
                        port: profile.port,
                        secure: profile.port === 465,
                        auth: {
                            user: profile.username,
                            pass: profile.password
                        },
                        tls: { rejectUnauthorized: false }
                    }),
                    fromEmail: profile.fromEmail,
                    fromName: profile.displayName
                };
            }
        }

        // Otherwise use default
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_SERVER || 'smtp.hostinger.com',
                port: Number(process.env.SMTP_PORT) || 465,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USERNAME || process.env.EMAIL_USER,
                    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS,
                },
                tls: { rejectUnauthorized: false }
            });
        }

        return {
            transporter: this.transporter,
            fromEmail: this.fromEmail,
            fromName: process.env.SMTP_FROM_NAME || 'MBH Team'
        };
    }

    async testConnection(smtpProfileId = null) {
        try {
            const { transporter } = await this._getTransporter(smtpProfileId);
            await transporter.verify();
            return { ok: true, message: "SMTP connection successful" };
        } catch (error) {
            console.error("SMTP Connection Error:", error);
            return { ok: false, message: error.message };
        }
    }

    /**
     * Send bulk email campaign
     * recipients: Array of { email, name, token? }
     */
    async sendCampaign({ recipients, subject, htmlTemplate, attachments = [], embedImagePath = null, smtpProfileId = null }) {
        const { transporter, fromEmail, fromName } = await this._getTransporter(smtpProfileId);
        let sent = 0;
        let failed = 0;
        let skipped = 0;
        const errors = [];

        for (const person of recipients) {
            if (person.status === 'UNSUBSCRIBED') {
                skipped++;
                continue;
            }

            const token = person.token || crypto.randomUUID();
            const unsubLink = `${this.unsubBaseUrl}?t=${token}`;
            const name = person.name || 'Dear Guest';

            let body = htmlTemplate.replace(/\{\{name\}\}/g, name).replace(/\{\{unsubscribe_link\}\}/g, unsubLink);
            // Replace legacy {name} and {unsubscribe_link} formats if any
            body = body.replace(/\{name\}/g, name).replace(/\{unsubscribe_link\}/g, unsubLink);

            try {
                const mailOptions = {
                    from: `"${fromName}" <${fromEmail}>`,
                    to: person.email,
                    subject: subject,
                    html: body,
                    attachments: attachments.map(att => ({
                        content: att.content,
                        filename: att.filename
                    }))
                };

                if (embedImagePath && fs.existsSync(embedImagePath)) {
                    mailOptions.attachments.push({
                        filename: path.basename(embedImagePath),
                        path: embedImagePath,
                        cid: 'invitation' // Same cid value as in the html template
                    });
                }

                await transporter.sendMail(mailOptions);
                sent++;
            } catch (error) {
                console.error(`Failed to send email to ${person.email}:`, error);
                failed++;
                errors.push(`${person.email}: ${error.message}`);
            }
        }

        return { sent, failed, skipped, errors };
    }

    async sendSingle({ toEmail, subject, htmlBody, name = "Dear Guest" }) {
        const transporter = this._getTransporter();
        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || 'MBH Team'}" <${this.fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: htmlBody.replace(/\{\{name\}\}/g, name).replace(/\{name\}/g, name)
        };

        try {
            await transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error(`Failed to send single email to ${toEmail}:`, error);
            throw error;
        }
    }
}

module.exports = new EmailCampaignService();
