import Stripe from 'stripe'

let client = null

// Returns null (not a thrown error) when STRIPE_SECRET_KEY isn't set, so
// the rest of the app keeps working without Stripe configured - callers
// turn that into a clear "payments aren't set up yet" response instead
// of a crash.
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return client
}
