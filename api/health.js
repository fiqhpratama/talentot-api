const { sendJson } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, {
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  sendJson(res, 200, {
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
