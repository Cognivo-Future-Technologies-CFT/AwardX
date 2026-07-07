export function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Too many reset emails were sent recently. Please wait about an hour, or try again after configuring custom email delivery.';
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('wrong password')) {
    return "That email and password combination doesn't match. Check your spelling or reset your password.";
  }
  if (m.includes('email not confirmed')) {
    return 'Please check your inbox and click the confirmation link we sent you.';
  }
  if (m.includes('user not found') || m.includes('no user found')) {
    return "We couldn't find an account with that email. Try signing up instead.";
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Connection error. Check your internet and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}
