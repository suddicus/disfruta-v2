const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('Email service initialization failed:', error);
        } else {
          console.log('📧 Email service ready');
        }
      });
    } catch (error) {
      console.error('Email service setup error:', error);
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `"${process.env.FROM_NAME || 'Disfruta Platform'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      console.error('Send email error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Disfruta - P2P Lending Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Disfruta!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your P2P Lending Journey Starts Here</p>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.name}!</h2>
          
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining Disfruta, the modern peer-to-peer lending platform that connects borrowers and lenders directly.
          </p>
          
          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Next Steps:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Verify your email address to unlock all features</li>
              <li>Complete your KYC verification for secure transactions</li>
              <li>Explore available loans or start your lending journey</li>
              <li>Set up your payment methods and preferences</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 40px;">
            If you have any questions, our support team is here to help.<br>
            Contact us at support@disfruta.com
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendEmailVerification(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const subject = 'Verify Your Email - Disfruta Platform';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #667eea; padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Email Verification</h1>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Hello ${user.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Please click the button below to verify your email address and complete your registration.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #667eea;">${verificationUrl}</a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This verification link will expire in 24 hours. If you didn't create an account with Disfruta, please ignore this email.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - Disfruta Platform';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Hello ${user.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #dc3545;">${resetUrl}</a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This password reset link will expire in 10 minutes. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendLoanApprovalNotification(user, loan) {
    const subject = 'Loan Application Approved - Disfruta Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Loan Approved! 🎉</h1>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Congratulations ${user.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Your loan application has been approved and is now available for funding.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Loan Details:</h3>
            <ul style="color: #666; line-height: 1.6; list-style: none; padding: 0;">
              <li><strong>Amount:</strong> $${loan.amount.toLocaleString()}</li>
              <li><strong>Interest Rate:</strong> ${loan.interestRate}%</li>
              <li><strong>Term:</strong> ${loan.term} months</li>
              <li><strong>Grade:</strong> ${loan.grade}</li>
              <li><strong>Purpose:</strong> ${loan.purpose}</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Your loan is now open for investments. You'll receive notifications as investors fund your loan.
            Once fully funded, we'll contact you about the next steps.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/loans/${loan._id}" 
               style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Loan Details
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendPaymentReminder(user, payment) {
    const subject = 'Payment Reminder - Disfruta Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ffc107; padding: 30px 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Payment Reminder</h1>
        </div>
        
        <div style="padding: 40px 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Hello ${user.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            This is a friendly reminder that you have a loan payment due soon.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Payment Details:</h3>
            <ul style="color: #666; line-height: 1.6; list-style: none; padding: 0;">
              <li><strong>Amount Due:</strong> $${payment.amount.toLocaleString()}</li>
              <li><strong>Due Date:</strong> ${new Date(payment.dueDate).toLocaleDateString()}</li>
              <li><strong>Payment #:</strong> ${payment.paymentNumber}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments" 
               style="background: #ffc107; color: #333; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Make Payment
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            Please ensure your payment is made on time to maintain your good credit standing.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = new EmailService();