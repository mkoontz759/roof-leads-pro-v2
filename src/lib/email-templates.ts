export const passwordResetTemplate = (resetUrl: string) => ({
  subject: 'Reset your password',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            background-color: #0070f3;
            border-radius: 5px;
            color: white;
            display: inline-block;
            padding: 12px 24px;
            text-decoration: none;
            margin: 20px 0;
          }
          .footer {
            color: #666;
            font-size: 14px;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <h1>Reset Your Password</h1>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <div class="footer">
          <p>This email was sent from RealEstate SaaS. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `,
  text: `
    Reset Your Password
    
    We received a request to reset your password. Click the link below to create a new password:
    
    ${resetUrl}
    
    This link will expire in 1 hour for security reasons.
    
    If you didn't request this password reset, you can safely ignore this email.
  `
})

export const verificationEmailTemplate = (verifyUrl: string) => ({
  subject: 'Verify your email address',
  html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            background-color: #0070f3;
            border-radius: 5px;
            color: white;
            display: inline-block;
            padding: 12px 24px;
            text-decoration: none;
            margin: 20px 0;
          }
          .footer {
            color: #666;
            font-size: 14px;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <h1>Verify Your Email</h1>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <a href="${verifyUrl}" class="button">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <div class="footer">
          <p>This email was sent from RealEstate SaaS. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `,
  text: `
    Verify Your Email
    
    Thank you for registering. Please click the link below to verify your email address:
    
    ${verifyUrl}
    
    This link will expire in 24 hours.
    
    If you didn't create an account, you can safely ignore this email.
  `
}) 