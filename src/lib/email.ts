import { passwordResetTemplate } from './email-templates'
import { verificationEmailTemplate } from './email-templates'
import { sendGHLEmail } from './ghl-api'

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  const template = passwordResetTemplate(resetUrl)

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset link:', resetUrl)
      return true
    }

    await sendGHLEmail({
      to: [email],
      subject: template.subject,
      htmlContent: template.html,
      plainContent: template.text,
    })

    return true
  } catch (error) {
    console.error('Failed to send reset email:', error)
    return false
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`
  const template = verificationEmailTemplate(verifyUrl)

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('Verification link:', verifyUrl)
      return true
    }

    // TODO: Implement your email sending logic here
    console.log('Verification email would be sent to:', email)
    console.log('With URL:', verifyUrl)

    return true
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return false
  }
} 