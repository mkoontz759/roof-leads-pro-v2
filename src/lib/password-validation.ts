export interface PasswordValidationResult {
  isValid: boolean
  score: number // 0-4
  errors: string[]
  warnings: string[]
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else if (password.length > 72) {
    warnings.push('Password is very long, some systems might truncate it')
  } else {
    score += 1
  }

  // Complexity checks
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSpecialChars = /[^A-Za-z0-9]/.test(password)

  if (!hasUppercase) errors.push('Must contain at least one uppercase letter')
  if (!hasLowercase) errors.push('Must contain at least one lowercase letter')
  if (!hasNumbers) errors.push('Must contain at least one number')
  if (!hasSpecialChars) errors.push('Must contain at least one special character')

  // Add to score based on complexity
  if (hasUppercase && hasLowercase) score += 1
  if (hasNumbers) score += 1
  if (hasSpecialChars) score += 1

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Contains repeated characters')
    score -= 1
  }

  if (/^[A-Za-z]+$/.test(password)) {
    warnings.push('Contains only letters')
    score -= 1
  }

  if (/^[0-9]+$/.test(password)) {
    warnings.push('Contains only numbers')
    score -= 1
  }

  // Normalize score to 0-4 range
  score = Math.max(0, Math.min(4, score))

  return {
    isValid: errors.length === 0,
    score,
    errors,
    warnings
  }
} 