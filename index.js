const http = require("http");
const talenta = require("./talenta");
const { detectLocation } = require("./location");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function getErrorStatusCode(error) {
  if (error.message === "Invalid email or password") {
    return 401;
  }

  if (
    error.message === "username and password are required" ||
    error.message === "lat and long are required on Vercel deployments" ||
    error.message === "lat and long are required when auto location detection fails" ||
    error.message === "Invalid JSON body" ||
    error.message === "Request body too large"
  ) {
    return 400;
  }

  return 500;
}

async function resolveAttendanceLocation(payload) {
  if (payload.lat && payload.long) {
    return {
      lat: String(payload.lat),
      long: String(payload.long),
      source: "request",
    };
  }

  if (process.env.VERCEL) {
    throw new Error("lat and long are required on Vercel deployments");
  }

  try {
    const detectedLocation = await detectLocation();
    return {
      lat: detectedLocation.latitude,
      long: detectedLocation.longitude,
      source: "auto-detected",
    };
  } catch (error) {
    throw new Error("lat and long are required when auto location detection fails");
  }
}

async function handleFetchCookies(body) {
  const { username, password } = body;

  if (!username || !password) {
    throw new Error("username and password are required");
  }

  const cookies = await talenta.fetchCookies(username, password);

  return {
    cookies,
  };
}

async function handleAttendance(body, mode) {
  const { username, password, desc } = body;

  if (!username || !password) {
    throw new Error("username and password are required");
  }

  const location = await resolveAttendanceLocation(body);
  const cookies = await talenta.fetchCookies(username, password);

  const payload = {
    lat: location.lat,
    long: location.long,
    cookies,
    desc:
      desc ||
      (mode === "clockin"
        ? "Clock in via API with auto-fetched cookies"
        : "Clock out via API with auto-fetched cookies"),
  };

  let attendance;

  try {
    attendance = mode === "clockin" ? await talenta.clockIn(payload) : await talenta.clockOut(payload);
  } catch (error) {
    if (!talenta.isSourceInvalidRequestError(error)) {
      throw error;
    }

    const browserResult =
      mode === "clockin"
        ? await talenta.clockInWithBrowser({
            email: username,
            password,
            lat: location.lat,
            long: location.long,
            desc: payload.desc,
          })
        : await talenta.clockOutWithBrowser({
            email: username,
            password,
            lat: location.lat,
            long: location.long,
            desc: payload.desc,
          });

    attendance = browserResult.attendance;
  }

  return {
    cookies,
    location,
    attendance,
  };
}

async function handler(req, res) {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/favicon.ico") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET" && pathname === "/") {
      sendJson(res, 200, {
        success: true,
        service: "talenta-api",
        status: "ok",
        endpoints: ["/health", "/fetch-cookies", "/clockin", "/clockout"],
      });
      return;
    }

    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        success: true,
        status: "ok",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 404, {
        success: false,
        message: "Route not found",
      });
      return;
    }

    const body = await parseJsonBody(req);

    if (pathname === "/fetch-cookies") {
      sendJson(res, 200, {
        success: true,
        data: await handleFetchCookies(body),
      });
      return;
    }

    if (pathname === "/clockin") {
      sendJson(res, 200, {
        success: true,
        data: await handleAttendance(body, "clockin"),
      });
      return;
    }

    if (pathname === "/clockout") {
      sendJson(res, 200, {
        success: true,
        data: await handleAttendance(body, "clockout"),
      });
      return;
    }

    sendJson(res, 404, {
      success: false,
      message: "Route not found",
    });
  } catch (error) {
    sendJson(res, getErrorStatusCode(error), {
      success: false,
      message: error.message,
    });
  }
}

handler.clockIn = talenta.clockIn;
handler.clockOut = talenta.clockOut;
handler.fetchCookies = talenta.fetchCookies;

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  http.createServer(handler).listen(port, () => {
    console.log(`Talenta API server listening on port ${port}`);
  });
}

module.exports = handler;
