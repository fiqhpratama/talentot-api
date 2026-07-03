/**
 * Authentication helper functions for Talenta API
 */

const crypto = require("crypto");

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

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const randomAlphaNumeric = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};

const ensureBrowserCookies = (cookieString, options = {}) => {
  const userAgent = options.userAgent || "";
  const timezone = options.timezone || "Asia/Jakarta";
  const language = options.language || "id-ID";
  const screen = options.screen || "1920x1080";

  const browserId = sha256(`${userAgent}${screen}${timezone}${language}`);
  const rs = randomAlphaNumeric(32);
  const browserFingerprint = `${sha256(`${browserId}|${userAgent}|${timezone}|${language}`)}11111v2`;

  return mergeCookies(
    cookieString,
    `browser_id=${browserId}`,
    `rs=${rs}`,
    `b_id4=${browserFingerprint}`
  );
};

module.exports = {
  extractAuthenticityToken,
  extractCookies,
  mergeCookies,
  extractSessionCookie,
  ensureBrowserCookies,
};
