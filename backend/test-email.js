const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const host = process.env.SMTP_SERVER || 'smtp.hostinger.com';
const user = process.env.SMTP_USERNAME || process.env.EMAIL_USER;
const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
const port = Number(process.env.SMTP_PORT) || 465;

console.log('Testing SMTP Configuration:');
console.log('Host:', host);
console.log('User:', user);
console.log('Port:', port);
console.log('Using Password from environment variable...');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass,
  },
  tls: {
    rejectUnauthorized: false,
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed:', JSON.stringify(error, null, 2));
    if (error.code === 'EAUTH') {
        console.error('\n--- POSSIBLE SOLUTIONS ---');
        console.error('1. Check if the password in .env is correct.');
        console.error('2. If using Two-Factor Authentication, you need to create an App Password.');
        console.error('3. Log in to your Hostinger Webmail at may.hostinger.com to unlock the account.');
        console.error('4. Ensure SMTP is enabled for your email account in Hostinger Control Panel.');
        console.error('5. Check if your hosting restricts outbound SMTP (less likely for 535).');
    }
  } else {
    console.log('✅ SMTP Server reached and authorized successfully!');
    
    // Attempt to send a test email
    const mailOptions = {
        from: user,
        to: user,
        subject: 'SMTP Connection Test',
        text: 'This is a test email to verify the SMTP configuration in authController.js'
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('❌ Failed to send test email:', err);
        } else {
            console.log('✅ Test email sent successfully:', info.response);
        }
        process.exit();
    });
  }
});
