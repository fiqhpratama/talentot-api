// Using native Node.js fetch and FormData (available in Node.js 18+)
const {
  extractAuthenticityToken,
  extractCookies,
  mergeCookies,
  extractSessionCookie,
} = require("./lib/auth-helpers");

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

// ROT13 encoding function to replace string-codec
function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const start = char <= "Z" ? 65 : 97;
    return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
  });
}

// Encoding function to replace string-codec encoder
function encoder(value, encoding) {
  if (encoding === "base64") {
    return Buffer.from(value).toString("base64");
  } else if (encoding === "rot13") {
    return rot13(value);
  }
  return value;
}

const getCsrfToken = async (cookies) => {
  try {
    const response = await fetch("https://hr.talenta.co/live-attendance", {
      headers: {
        Cookie: cookies,
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const csrfMatches = [
      html.match(/name="csrf-token" content="([^"]+)"/),
      html.match(/name="_token" content="([^"]+)"/),
      html.match(/window\.Laravel\.csrfToken = "([^"]+)"/),
      html.match(/<meta name="csrf-token" content="([^"]+)"/),
    ];

    for (const match of csrfMatches) {
      if (match) return match[1];
    }

    return null;
  } catch (error) {
    console.warn("Could not fetch CSRF token:", error.message);
    return null;
  }
};

const prepForm = async (obj) => {
  const { long, lat, desc, cookies, isCheckOut = false } = obj;
  const data = new FormData();
  const status = isCheckOut ? "checkout" : "checkin";

  const longEncoded = encoder(encoder(long, "base64"), "rot13");
  const latEncoded = encoder(encoder(lat, "base64"), "rot13");

  data.append("longitude", longEncoded);
  data.append("latitude", latEncoded);
  data.append("status", status);
  data.append("description", desc);

  const csrfToken = await getCsrfToken(cookies);
  if (csrfToken) {
    data.append("_token", csrfToken);
  }

  const headers = {
    Cookie: cookies,
    "User-Agent": DEFAULT_USER_AGENT,
    Referer: "https://hr.talenta.co/live-attendance",
    Origin: "https://hr.talenta.co",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (csrfToken) {
    headers["X-CSRF-TOKEN"] = csrfToken;
  }

  return {
    method: "POST",
    url: "https://hr.talenta.co/api/web/live-attendance/request",
    headers,
    body: data,
  };
};

const attendancePost = async (obj) => {
  const config = await prepForm(obj);

  const response = await fetch(config.url, {
    method: config.method,
    headers: config.headers,
    body: config.body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorText,
    };

    try {
      error.response.data = JSON.parse(errorText);
    } catch (parseError) {
      // Keep response text if it is not JSON.
    }

    throw error;
  }

  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    return responseText;
  }
};

const clockIn = async (obj) => {
  return await attendancePost({ ...obj, isCheckOut: false });
};

const clockOut = async (obj) => {
  return await attendancePost({ ...obj, isCheckOut: true });
};

const resolveRedirectUrl = (baseUrl, locationHeader) => {
  try {
    return new URL(locationHeader, baseUrl).toString();
  } catch (error) {
    return locationHeader;
  }
};

const followRedirectChainForTalentaCookies = async (startUrl, initialCookies, initialReferer) => {
  let currentUrl = startUrl;
  let cookieJar = initialCookies || "";
  let referer = initialReferer;

  for (let redirectCount = 0; redirectCount < 10; redirectCount += 1) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookieJar,
        "User-Agent": DEFAULT_USER_AGENT,
        ...(referer ? { Referer: referer } : {}),
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "manual",
    });

    cookieJar = mergeCookies(cookieJar, extractCookies(response.headers));

    const sessionCookie = extractSessionCookie(cookieJar);
    if (sessionCookie) {
      return sessionCookie;
    }

    const locationHeader = response.headers.get("location");
    if (!locationHeader) {
      break;
    }

    referer = currentUrl;
    currentUrl = resolveRedirectUrl(currentUrl, locationHeader);
  }

  const sessionCookie = extractSessionCookie(cookieJar);
  if (sessionCookie) {
    return sessionCookie;
  }

  throw new Error("Failed to get session cookies from Talenta");
};

/**
 * Fetch cookies automatically using username and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} - Cookie string for use with clockIn/clockOut
 */
const fetchCookies = async (email, password) => {
  try {
    console.log("Starting authentication process...");

    const loginPageUrl = "https://account.mekari.com/users/sign_in?app_referer=Talenta";
    const loginPageResponse = await fetch(loginPageUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!loginPageResponse.ok) {
      throw new Error(`Failed to load login page: ${loginPageResponse.status}`);
    }

    const loginPageHtml = await loginPageResponse.text();
    const authenticityToken = extractAuthenticityToken(loginPageHtml);

    if (!authenticityToken) {
      throw new Error("Could not extract authenticity token from login page");
    }

    let cookieJar = extractCookies(loginPageResponse.headers);
    console.log("Successfully extracted authenticity token");

    console.log("Submitting login credentials...");

    const formData = new FormData();
    formData.append("utf8", "✓");
    formData.append("authenticity_token", authenticityToken);
    formData.append("user[email]", email);
    formData.append("no-captcha-token", "");
    formData.append("user[password]", password);

    const loginResponse = await fetch(loginPageUrl, {
      method: "POST",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookieJar,
        "User-Agent": DEFAULT_USER_AGENT,
        Referer: loginPageUrl,
        Origin: "https://account.mekari.com",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      body: formData,
      redirect: "manual",
    });

    if (loginResponse.status !== 302) {
      const errorText = await loginResponse.text();
      if (errorText.includes("Invalid email or password")) {
        throw new Error("Invalid email or password");
      }
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    cookieJar = mergeCookies(cookieJar, extractCookies(loginResponse.headers));
    console.log("Login successful");

    console.log("Getting authorization code...");

    const authUrl =
      "https://account.mekari.com/auth?client_id=TAL-73645&response_type=code&scope=sso:profile";
    const authResponse = await fetch(authUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookieJar,
        "User-Agent": DEFAULT_USER_AGENT,
        Referer: loginPageUrl,
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "manual",
    });

    if (authResponse.status < 300 || authResponse.status >= 400) {
      throw new Error(`Authorization failed: ${authResponse.status} ${authResponse.statusText}`);
    }

    cookieJar = mergeCookies(cookieJar, extractCookies(authResponse.headers));
    console.log("Authorization step accepted");

    const locationHeader = authResponse.headers.get("location");
    if (!locationHeader) {
      throw new Error("Authorization redirect location is missing");
    }

    console.log("Following authorization redirects for session cookies...");

    const finalCookie = await followRedirectChainForTalentaCookies(
      resolveRedirectUrl(authUrl, locationHeader),
      cookieJar,
      authUrl
    );

    console.log("Successfully obtained session cookies");
    return finalCookie;
  } catch (error) {
    console.error("Cookie fetching failed:", error.message);
    throw error;
  }
};

module.exports = {
  clockIn,
  clockOut,
  fetchCookies,
};
