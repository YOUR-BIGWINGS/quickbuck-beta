// Extract domain from Clerk publishable key
// Format: pk_test_<base64> or pk_live_<base64>
// The domain is encoded in the key and Clerk uses it for JWT validation
function getClerkDomain() {
  // Use hardcoded domain to avoid requiring environment variable in Convex
  // This matches the domain from your Clerk dashboard
  return 'https://select-corgi-4.clerk.accounts.dev';
}

export default {
    providers: [
      {
        domain: getClerkDomain(),
        applicationID: "convex",
      },
    ]
  };