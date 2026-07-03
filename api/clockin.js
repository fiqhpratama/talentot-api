const talenta = require("../talenta");
const { parseJsonBody, sendJson } = require("./_utils");

function getErrorStatusCode(error) {
  if (error.message === "Invalid email or password") {
    return 401;
  }

  if (
    error.message === "username and password are required" ||
    error.message === "lat and long are required on Vercel deployments"
  ) {
    return 400;
  }

  return 500;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  try {
    const { username, password, lat, long, desc } = await parseJsonBody(req);

    if (!username || !password) {
      throw new Error("username and password are required");
    }

    if (!lat || !long) {
      throw new Error("lat and long are required on Vercel deployments");
    }

    const cookies = await talenta.fetchCookies(username, password);
    const attendance = await talenta.clockIn({
      lat: String(lat),
      long: String(long),
      cookies,
      desc: desc || "Clock in via API with auto-fetched cookies",
    });

    sendJson(res, 200, {
      success: true,
      data: {
        cookies,
        attendance,
      },
    });
  } catch (error) {
    sendJson(res, getErrorStatusCode(error), {
      success: false,
      message: error.message,
    });
  }
};
