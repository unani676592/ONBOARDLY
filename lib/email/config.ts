// Single source of truth for the outbound sender identity.
//
// For now this is Resend's shared test sender (onboarding@resend.dev), which
// only delivers to your own Resend account email until a real domain is
// verified. Swapping to a verified domain later is a ONE-LINE change here —
// e.g. "Onboardly <hello@yourdomain.com>". No other file references the
// from-address.
export const EMAIL_FROM = "Onboardly <onboarding@resend.dev>";
