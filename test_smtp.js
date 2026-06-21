const nodemailer = require('nodemailer');
require('dotenv').config({ path: './backend/.env' });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});

const mailOptions = {
  from: `"Support System" <${process.env.SMTP_FROM_EMAIL || 'cag_team@ponnaiyacag.com'}>`,
  to: 'babudhawan456@gmail.com', // Test recipient
  subject: 'Test Email from MBH',
  text: 'This is a test email to verify SMTP configuration.'
};

console.log('Using SMTP Settings:');
console.log('Host:', process.env.SMTP_SERVER);
console.log('User:', process.env.SMTP_USERNAME);

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Test Failed:', error.message);
    process.exit(1);
  } else {
    console.log('Test Successful:', info.response);
    process.exit(0);
  }
});
