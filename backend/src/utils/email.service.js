/**
 * Email module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('./logger');
const hasSmtpConfig = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
// Create Transporter builds a new record from validated input.
const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};
const sendVerificationEmail = async ({ to, name, verificationUrl, expiresAt }) => {
  const transporter = createTransporter();
  const expiresText = expiresAt.toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kuala_Lumpur',
  });

  const message = {
    from: env.emailFrom,
    to,
    subject: 'Verify your Smart Travel Planner account',
    html: `
      <div style="font-family: Arial, sans-serif; color: #102a43; line-height: 1.6;">
        <h2>Verify your email</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>Please verify your email address before logging in to Smart Travel Planner.</p>
        <p><a href="${escapeHtml(verificationUrl)}" style="display: inline-block; padding: 12px 18px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 8px;">Verify email</a></p>
        <p>This link expires on ${escapeHtml(expiresText)}.</p>
        <p>If the button does not work, copy this link into your browser:</p>
        <p>${escapeHtml(verificationUrl)}</p>
      </div>
    `,
    text: `Hi ${name || 'there'},\n\nVerify your Smart Travel Planner account here:\n${verificationUrl}\n\nThis link expires on ${expiresText}.`,
  };

  const info = await transporter.sendMail(message);

  if (!hasSmtpConfig()) {
    logger.info(`Email verification link for ${to}: ${verificationUrl}`);
    logger.info(`SMTP is not configured. Email preview payload: ${info.message}`);
  }

  return info;
};
module.exports = { sendVerificationEmail };
