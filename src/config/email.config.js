const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_APP_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

console.log("Email Service Loaded");


// Professional Premium Email Template
const emailTemplate = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f4f7fb;
  font-family:'Segoe UI',Roboto,Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
<tr>
<td align="center">

<!-- Container -->
<table width="100%" cellpadding="0" cellspacing="0"
style="
  max-width:600px;
  background:#ffffff;
  border-radius:16px;
  overflow:hidden;
  box-shadow:0 10px 30px rgba(0,0,0,0.08);
">

<!-- Header -->
<tr>
<td style="
  background:linear-gradient(135deg,#6366f1,#4f46e5,#7c3aed);
  padding:30px 20px;
  text-align:center;
  color:white;
">

<div style="font-size:24px;font-weight:700;letter-spacing:0.5px;">
Project-IC
</div>

<div style="
  font-size:14px;
  opacity:0.9;
  margin-top:5px;
">
Professional Interview Preparation Platform
</div>

</td>
</tr>

<!-- Title -->
<tr>
<td style="
  padding:30px 30px 10px 30px;
  font-size:22px;
  font-weight:600;
  color:#111827;
  text-align:center;
">
${title}
</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 30px;">
<div style="
  height:1px;
  background:#e5e7eb;
"></div>
</td>
</tr>

<!-- Content -->
<tr>
<td style="
  padding:25px 30px;
  color:#374151;
  font-size:15px;
  line-height:1.7;
">
${content}
</td>
</tr>

<!-- Button -->
<tr>
<td align="center" style="padding:10px 30px 30px 30px;">

<a href="https://your-domain.com"
style="
  display:inline-block;
  background:linear-gradient(135deg,#6366f1,#4f46e5);
  color:white;
  text-decoration:none;
  padding:14px 28px;
  border-radius:8px;
  font-weight:600;
  font-size:14px;
  box-shadow:0 4px 14px rgba(79,70,229,0.4);
">
Open Project-IC
</a>

</td>
</tr>

<!-- Footer -->
<tr>
<td style="
  background:#f9fafb;
  padding:25px;
  text-align:center;
">

<div style="
  font-size:13px;
  color:#6b7280;
  margin-bottom:10px;
">
© ${new Date().getFullYear()} Project-IC. All rights reserved.
</div>

<div style="
  font-size:12px;
  color:#9ca3af;
">
This is an automated email. Please do not reply.
</div>

</td>
</tr>

</table>

<!-- Bottom spacing -->
<div style="height:20px;"></div>

</td>
</tr>
</table>

</body>
</html>
`;


// Main Email Service Function
const EmailService = async (email, subject_text, message) => {

  const mailOptions = {
    from: `"Project-IC Team" <${process.env.GOOGLE_APP_EMAIL}>`,
    to: email,
    subject: subject_text,

    // fallback text version
    text: message.replace(/<[^>]*>?/gm, ""),

    // HTML version
    html: emailTemplate(subject_text, message),
  };

  try {

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent successfully");
    console.log("Message ID:", info.messageId);

    return true;

  } catch (error) {

    console.error("Email failed:", error.message);

    return false;
  
  }

};

module.exports = EmailService;

