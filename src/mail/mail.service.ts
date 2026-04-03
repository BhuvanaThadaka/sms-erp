import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const port = Number(this.configService.get('SMTP_PORT', 587));
    const secure = this.configService.get('SMTP_SECURE') === 'true' || this.configService.get('SMTP_SECURE') === true;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port,
      secure,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendWelcomeEmail(user: any) {
    const appName = this.configService.get<string>('APP_NAME', 'SchoolERP');
    const roleLabel = user.role === 'TEACHER' ? 'Teacher' : 'Student';
    const idLabel = user.role === 'TEACHER' ? 'Employee ID' : 'Enrollment Number';
    const idValue = user.role === 'TEACHER' ? user.employeeId : user.enrollmentNumber;

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('SMTP_FROM')}>`,
      to: user.email,
      subject: `Welcome to ${appName} - Your Account Details`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #3B82F6;">Welcome, ${user.firstName}!</h2>
          <p>Your account has been successfully created. Here are your registration details:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">User Role</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${idLabel}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${idValue}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${user.phone || 'N/A'}</td>
            </tr>
          </table>

          <p style="margin-top: 20px;">You can now login to the system using your email and the password you provided during registration.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get<string>('CORS_ORIGIN')}/login" 
               style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
               Login to Dashboard
            </a>
          </div>
          
          <p style="margin-top: 40px; font-size: 12px; color: #94A3B8; text-align: center;">
            &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to ${user.email}:`, error);
    }
  }

  async sendAdminNotification(user: any) {
    const appName = this.configService.get<string>('APP_NAME', 'SchoolERP');
    const roleLabel = user.role === 'TEACHER' ? 'Teacher' : 'Student';
    const idLabel = user.role === 'TEACHER' ? 'Employee ID' : 'Enrollment Number';
    const idValue = user.role === 'TEACHER' ? user.employeeId : user.enrollmentNumber;

    const mailOptions = {
      from: `"${appName} System" <${this.configService.get<string>('SMTP_FROM')}>`,
      to: this.configService.get<string>('SMTP_FROM'), // Sending to admin (using same email for now)
      subject: `New ${roleLabel} Registered: ${user.firstName} ${user.lastName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10B981;">New User Registration</h2>
          <p>A new <strong>${roleLabel}</strong> has registered in the system.</p>
          
          <div style="background-color: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${user.firstName} ${user.lastName}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>${idLabel}:</strong> ${idValue}</p>
            <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p>Please review this registration in the admin dashboard.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.configService.get<string>('CORS_ORIGIN')}/admin/users" 
               style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
               Manage Users
            </a>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification sent for ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send admin notification for ${user.email}:`, error);
    }
  }

  async sendPasswordResetEmail(user: any, token: string) {
    const appName = this.configService.get<string>('APP_NAME', 'SchoolERP');
    const resetUrl = `${this.configService.get<string>('CORS_ORIGIN')}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${appName}" <${this.configService.get<string>('SMTP_FROM')}>`,
      to: user.email,
      subject: `${appName} - Password Reset Request`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #3B82F6; border-radius: 10px;">
          <h2 style="color: #3B82F6;">Password Reset Request</h2>
          <p>Hello ${user.firstName},</p>
          <p>We received a request to reset your password for your ${appName} account. If you didn't request this, you can safely ignore this email.</p>
          
          <p>To reset your password, click the button below. This link will expire in 1 hour.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" 
               style="background-color: #3B82F6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
               Reset Password
            </a>
          </div>

          <p style="font-size: 13px; color: #64748B;">
            If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #3B82F6;">${resetUrl}</a>
          </p>
          
          <p style="margin-top: 40px; font-size: 12px; color: #94A3B8; border-top: 1px solid #eee; padding-top: 20px;">
            This is an automated message. Please do not reply.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${user.email}:`, error);
    }
  }
}
