// Customer-facing messages for Supabase Auth error codes (web and app).

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "That email and password don't match. Try again or reset your password.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for the link we sent.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a minute and try again.";
    case "weak_password":
      return "Choose a stronger password: at least 8 characters with letters and numbers.";
    case "same_password":
      return "Your new password must be different from your current one.";
    default:
      return GENERIC_AUTH_ERROR;
  }
}
