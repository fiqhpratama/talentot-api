const talenta = require("../index");

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
    res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  try {
    const { username, password, lat, long, desc } = req.body || {};

    if (!username || !password) {
      throw new Error("username and password are required");
    }

    if (!lat || !long) {
      throw new Error("lat and long are required on Vercel deployments");
    }

    const cookies = await talenta.fetchCookies(username, password);
    const attendance = await talenta.clockOut({
      lat: String(lat),
      long: String(long),
      cookies,
      desc: desc || "Clock out via API with auto-fetched cookies",
    });

    res.status(200).json({
      success: true,
      data: {
        cookies,
        attendance,
      },
    });
  } catch (error) {
    res.status(getErrorStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};
