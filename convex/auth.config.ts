// Extract domain from Clerk publishable key
// Format: pk_test_<base64> or pk_live_<base64>
// The domain is encoded in the key and Clerk uses it for JWT validation
function getClerkDomain() {
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    // Fallback to hardcoded domain for development
    return 'https://select-corgi-4.clerk.accounts.dev';
  }
  
  try {
    // Extract the base64 portion after pk_test_ or pk_live_
    const base64Part = publishableKey.split('_')[2];
    if (base64Part) {
      // Decode base64 to get the domain
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
      return `https://${decoded}`;
    }
  } catch (error) {
    console.warn('Failed to extract domain from Clerk key, using fallback');
  }
  
  // Fallback to hardcoded domain
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