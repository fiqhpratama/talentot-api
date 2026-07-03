const talenta = require("../index");

function getErrorStatusCode(error) {
  if (error.message === "Invalid email or password") {
    return 401;
  }

  if (
    error.message === "username and password are required" ||
    error.message === "Invalid JSON body" ||
    error.message === "Request body too large"
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
    const { username, password } = req.body || {};

    if (!username || !password) {
      throw new Error("username and password are required");
    }

    const cookies = await talenta.fetchCookies(username, password);

    res.status(200).json({
      success: true,
      data: {
        cookies,
      },
    });
  } catch (error) {
    res.status(getErrorStatusCode(error)).json({
      success: false,
      message: error.message,
    });
  }
};
