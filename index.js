module.exports = async function handler(req, res) {
  if (!req || !res) {
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      success: true,
      service: "talenta-api",
      status: "ok",
      endpoints: ["/health", "/fetch-cookies", "/clockin", "/clockout"],
    })
  );
};
