const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  APPLICATIONS_INBOX, // where candidate applications get sent
  MAIL_FROM,
} = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && APPLICATIONS_INBOX);

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sends a candidate application email. If SMTP isn't configured yet
 * (e.g. during local development), logs the application to the console
 * instead of throwing, so the form still "works" end to end while the
 * site owner finishes setting up real email credentials.
 */
async function sendApplicationEmail({ role, name, email, phone, message, attachment }) {
  const subject = `New application: ${role.title} (${role.contract})`;
  const text = [
    `Role: ${role.title}`,
    `Contract: ${role.contract}`,
    `Location: ${role.location}`,
    '',
    `Candidate: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    '',
    'Message:',
    message || '(no message provided)',
  ].join('\n');

  if (!isConfigured) {
    console.log('--- APPLICATION EMAIL (SMTP not configured, logging instead) ---');
    console.log(subject);
    console.log(text);
    if (attachment) console.log(`Attachment: ${attachment.originalname} (${attachment.size} bytes)`);
    console.log('-----------------------------------------------------------------');
    return { delivered: false, reason: 'SMTP not configured' };
  }

  await transporter.sendMail({
    from: MAIL_FROM || SMTP_USER,
    to: APPLICATIONS_INBOX,
    replyTo: email,
    subject,
    text,
    attachments: attachment
      ? [{ filename: attachment.originalname, content: attachment.buffer }]
      : [],
  });

  return { delivered: true };
}

module.exports = { sendApplicationEmail, isConfigured };
