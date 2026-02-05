const request = require("supertest");
const app = require("../server");

describe("Health endpoint", () => {
  it("GET /health returns 200 and status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("message", "TTS Golf App API is running");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("environment", "test");
  });
});
