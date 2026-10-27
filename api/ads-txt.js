"use strict";

/*
 * Serve the publisher's ads.txt entry with an explicit text/plain response.
 * Keep this endpoint separate from api/index.js so the match API is untouched.
 */
module.exports = function adsTxt(_req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.end("google.com, pub-4186453820862227, DIRECT, f08c47fec0942fa0\n");
};
