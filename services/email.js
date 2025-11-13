const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using SMTP config from env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendAppointmentConfirmation(to, appointment = {}, extras = {}) {
  const subject = `Appointment Confirmed — ${appointment.reference || ''}`;

  const html = `
    <p>Dear ${extras.patientName || 'Patient'},</p>
    <p>Your appointment has been <strong>confirmed</strong>.</p>
    <ul>
      <li><strong>Reference:</strong> ${appointment.reference || 'N/A'}</li>
      <li><strong>Test:</strong> ${appointment.medicalTest?.name || extras.testName || 'N/A'}</li>
      <li><strong>Hospital:</strong> ${appointment.hospital?.name || extras.hospitalName || 'N/A'}</li>
      <li><strong>Date:</strong> ${appointment.appointment_date || extras.date || 'N/A'}</li>
      <li><strong>Time:</strong> ${appointment.time_slot || extras.time || 'N/A'}</li>
    </ul>
    <p>Please arrive 10–15 minutes early and bring any required documents.</p>
    <p>Regards,<br/>SpeciCare Team</p>
  `;

  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending appointment confirmation email:', error);
    return { success: false, error };
  }
}

module.exports = {
  sendAppointmentConfirmation,
};

// Send password reset email with a secure short-lived token link
async function sendPasswordReset(to, resetLink, extras = {}) {
  const subject = `Reset your SpeciCare password`;

  const html = `
    <p>Hi ${extras.name || 'user'},</p>
    <p>We received a request to reset the password for your SpeciCare account.</p>
    <p>Please click the link below to choose a new password. This link will expire in 1 hour.</p>
    <p><a href="${resetLink}">Reset your password</a></p>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    <p>Regards,<br/>SpeciCare Team</p>
  `;

  const mailOptions = {
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
}

module.exports = {
  sendAppointmentConfirmation,
  sendPasswordReset,
};
