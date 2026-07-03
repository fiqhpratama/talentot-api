const talenta = require("../index");
const { parseJsonBody, sendJson } = require("./_utils");

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
    sendJson(res, 405, {
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  try {
    const { username, password } = await parseJsonBody(req);

    if (!username || !password) {
      throw new Error("username and password are required");
    }

    const cookies = await talenta.fetchCookies(username, password);

    sendJson(res, 200, {
      success: true,
      data: {
        cookies,
      },
    });
  } catch (error) {
    sendJson(res, getErrorStatusCode(error), {
      success: false,
      message: error.message,
    });
  }
};
