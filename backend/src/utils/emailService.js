import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add these options to prevent timeouts on cloud platforms (Railway/Render)
  pool: true, // use pooled connection
  maxConnections: 1,
  maxMessages: 10,
  tls: {
    rejectUnauthorized: false // helps with some strict cloud environments
  }
});

export const sendTrackingIdEmail = async (email, name, trackingId, consumerId) => {
  try {
    const mailOptions = {
      from: `"Smart Electricity Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Complaint Tracking ID - Smart Electricity Portal',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Hello ${name},</h2>
          <p>Thank you for filing your complaint with the Smart Electricity Portal. Your complaint has been successfully registered.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
            <p style="margin: 0; font-size: 1.1rem;"><strong>Consumer ID:</strong> ${consumerId}</p>
            <p style="margin: 10px 0 0 0; font-size: 1.1rem;"><strong>Your Tracking ID:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 1.5rem; color: #7c4dff; font-weight: bold; letter-spacing: 1px;">${trackingId}</p>
          </div>
          <p>Please save this Tracking ID for any future updates or to track the status of your complaint on our website.</p>
          <p>Best regards,<br>The Smart Electricity Portal Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Tracking ID email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const sendStatusUpdateEmail = async (email, name, trackingId, status, adminNote) => {
  try {
    const statusColor = status === 'resolved' ? '#00e676' : '#00d4ff';
    const mailOptions = {
      from: `"Smart Electricity Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Update on your Complaint: ${trackingId}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Hello ${name},</h2>
          <p>The status of your complaint (Tracking ID: <strong>${trackingId}</strong>) has been updated.</p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 5px solid ${statusColor};">
            <p style="margin: 0; font-size: 1.1rem;"><strong>New Status:</strong> <span style="color:${statusColor};text-transform:uppercase;font-weight:bold;">${status}</span></p>
            ${adminNote ? `<p style="margin: 10px 0 0 0; font-style: italic; color: #666;"><strong>Admin Note:</strong> "${adminNote}"</p>` : ''}
          </div>
          <p>You can track further details on our portal using your Tracking ID.</p>
          <p>Best regards,<br>The Smart Electricity Portal Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Status update email sent to ${email}`);
  } catch (error) {
    console.error('Error sending status update email:', error);
  }
};

export const sendOtpEmail = async (email, name, otp) => {
  try {
    const mailOptions = {
      from: `"Smart Electricity Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - Smart Electricity Portal',
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
          <h2>Hello ${name},</h2>
          <p>You requested a password reset. Please use the following One-Time Password (OTP) to reset your password. This code is valid for 10 minutes.</p>
          <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #cce5ff; text-align:center;">
            <p style="margin: 0; font-size: 0.9rem; color: #555;"><strong>Your OTP Code:</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 2.2rem; color: #007bff; font-weight: bold; letter-spacing: 5px;">${otp}</p>
          </div>
          <p>If you did not request this, please ignore this email and ensure your account is secure.</p>
          <p>Best regards,<br>The Smart Electricity Portal Team</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP email:', error);
  }
};
