/**
 * Federation Address Validator
 * Validates and normalizes Stellar federation addresses
 */

// Federation address format: username*domain.com
const FEDERATION_REGEX = /^[a-z0-9._-]+\*[a-z0-9.-]+\.[a-z]{2,}$/i;

/**
 * Validate federation address format
 * @param {string} address - Federation address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidFederationAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Must contain exactly one asterisk
  if ((address.match(/\*/g) || []).length !== 1) {
    return false;
  }

  // Match regex pattern
  if (!FEDERATION_REGEX.test(address)) {
    return false;
  }

  const [username, domain] = address.split('*');

  // Username validation
  if (username.length < 1 || username.length > 64) {
    return false;
  }

  // Domain validation
  if (domain.length < 4 || domain.length > 253) {
    return false;
  }

  // Check for consecutive dots or hyphens
  if (domain.includes('..') || domain.includes('--')) {
    return false;
  }

  return true;
}

/**
 * Normalize federation address (lowercase)
 * @param {string} address - Federation address to normalize
 * @returns {string} - Normalized address
 */
function normalizeFederationAddress(address) {
  if (!address) return '';
  return address.toLowerCase().trim();
}

/**
 * Extract username from federation address
 * @param {string} address - Federation address
 * @returns {string} - Username part
 */
function extractUsername(address) {
  if (!address || !address.includes('*')) return '';
  return address.split('*')[0];
}

/**
 * Extract domain from federation address
 * @param {string} address - Federation address
 * @returns {string} - Domain part
 */
function extractDomain(address) {
  if (!address || !address.includes('*')) return '';
  return address.split('*')[1];
}

/**
 * Get validation error message
 * @param {string} address - Federation address to validate
 * @returns {string|null} - Error message or null if valid
 */
function getValidationError(address) {
  if (!address) {
    return 'Federation address is required';
  }

  if (typeof address !== 'string') {
    return 'Federation address must be a string';
  }

  const asteriskCount = (address.match(/\*/g) || []).length;
  if (asteriskCount === 0) {
    return 'Federation address must contain an asterisk (*)';
  }
  if (asteriskCount > 1) {
    return 'Federation address must contain exactly one asterisk (*)';
  }

  const [username, domain] = address.split('*');

  if (!username) {
    return 'Username cannot be empty';
  }

  if (username.length < 1) {
    return 'Username must be at least 1 character';
  }

  if (username.length > 64) {
    return 'Username cannot exceed 64 characters';
  }

  if (!/^[a-z0-9._-]+$/i.test(username)) {
    return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
  }

  if (!domain) {
    return 'Domain cannot be empty';
  }

  if (domain.length < 4) {
    return 'Domain is too short';
  }

  if (domain.length > 253) {
    return 'Domain is too long';
  }

  if (!domain.includes('.')) {
    return 'Domain must include a top-level domain (e.g., .com, .org)';
  }

  if (domain.includes('..') || domain.includes('--')) {
    return 'Domain contains invalid consecutive characters';
  }

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return 'Invalid domain format';
  }

  return null;
}

module.exports = {
  isValidFederationAddress,
  normalizeFederationAddress,
  extractUsername,
  extractDomain,
  getValidationError
};
