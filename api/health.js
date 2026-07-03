module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
