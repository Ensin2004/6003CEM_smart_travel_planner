/**
 * Email module.
 * Business rules, repository access, and external integrations live in this layer.
 */
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const env = require('../config/env');
const logger = require('./logger');

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

// Resend uses HTTPS and is preferred in hosted environments where SMTP ports may be unavailable.
const hasResendConfig = () => Boolean(resend);

// Checks if SMTP configuration is available for real email delivery.
const hasSmtpConfig = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

// Escapes HTML special characters to prevent injection attacks.
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Creates a nodemailer transporter with SMTP or fallback JSON transport.
const createTransporter = () => {
  if (!hasSmtpConfig()) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    family: 4,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

// Sends through Resend when configured, then falls back to SMTP or local JSON preview delivery.
const sendEmail = async (message, previewLabel) => {
  if (hasResendConfig()) {
    const { data, error } = await resend.emails.send(message);
    if (error) {
      throw new Error(`Resend email failed: ${error.message || 'Unknown API error'}`);
    }
    return data;
  }

  const transporter = createTransporter();
  const info = await transporter.sendMail(message);

  if (!hasSmtpConfig()) {
    logger.info(`${previewLabel}: ${info.message}`);
  }

  return info;
};

// Sends a verification email with an expiring link for email confirmation.
const sendVerificationEmail = async ({ to, name, verificationUrl, expiresAt }) => {
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

  return sendEmail(message, `Email verification preview for ${to}`);
};

// Sends a generic notification email with optional action link.
const sendNotificationEmail = async ({ to, name, title, message, actionUrl }) => {
  const htmlAction = actionUrl
    ? `<p><a href="${escapeHtml(actionUrl)}" style="display: inline-block; padding: 12px 18px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 8px;">Open notification</a></p>`
    : '';

  const email = {
    from: env.emailFrom,
    to,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>${escapeHtml(title)}</h2>
        <p>Hi ${escapeHtml(name || 'there')},</p>
        <p>${escapeHtml(message)}</p>
        ${htmlAction}
      </div>
    `,
    text: `Hi ${name || 'there'},\n\n${title}\n\n${message}${actionUrl ? `\n\nOpen: ${actionUrl}` : ''}`,
  };

  return sendEmail(email, `Notification email preview for ${to}: ${title}`);
};

// Exports email sending functions for use across the application.
module.exports = { sendNotificationEmail, sendVerificationEmail };
