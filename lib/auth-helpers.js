/**
 * Authentication helper functions for Talenta API
 */

const COOKIE_NAME_PATTERN = /^(?<name>[^=]+)=(?<value>.*)$/;

/**
 * Extract authenticity token from login page
 * @param {string} html - HTML content of the login page
 * @returns {string|null} - The authenticity token or null if not found
 */
const extractAuthenticityToken = (html) => {
  const tokenMatches = [
    html.match(/name="authenticity_token" value="([^"]+)"/),
    html.match(/<input[^>]*name="authenticity_token"[^>]*value="([^"]+)"/),
    html.match(/authenticity_token[^"]*"([^"]+)"/),
  ];
  
  for (const match of tokenMatches) {
    if (match) return match[1];
  }
  
  return null;
};

/**
 * Extract cookies from response headers
 * @param {Headers} headers - Response headers
 * @returns {string} - Formatted cookie string
 */
const extractCookies = (headers) => {
  if (typeof headers.getSetCookie === "function") {
    const setCookies = headers.getSetCookie();
    if (!setCookies.length) return "";

    return setCookies
      .map((cookie) => cookie.trim().split(";")[0])
      .join("; ");
  }

  const setCookies = headers.get("set-cookie");
  if (!setCookies) return "";

  return setCookies
    .split(/,(?=[^;,]+=)/)
    .map((cookie) => cookie.trim().split(";")[0])
    .join("; ");
};

const mergeCookies = (...cookieStrings) => {
  const cookieMap = new Map();

  for (const cookieString of cookieStrings) {
    if (!cookieString) continue;

    for (const cookiePart of cookieString.split(";")) {
      const cookie = cookiePart.trim();
      if (!cookie) continue;

      const match = cookie.match(COOKIE_NAME_PATTERN);
      if (!match || !match.groups) continue;

      cookieMap.set(match.groups.name.trim(), match.groups.value.trim());
    }
  }

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
};

const extractSessionCookie = (cookieString) => {
  const cookieMatch = cookieString.match(/(?:PHPSESSID|_identity)=[^;]+/);
  return cookieMatch ? cookieMatch[0] : "";
};

module.exports = {
  extractAuthenticityToken,
  extractCookies,
  mergeCookies,
  extractSessionCookie,
};
