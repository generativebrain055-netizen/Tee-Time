const request = require("supertest");
const app = require("../server");

describe("Auth - OTP validation", () => {
  describe("POST /auth/request-otp", () => {
    it("returns 400 when phoneNumber is missing", async () => {
      const res = await request(app).post("/auth/request-otp").send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });

    it("returns 400 when phoneNumber format is invalid", async () => {
      const res = await request(app)
        .post("/auth/request-otp")
        .send({ phoneNumber: "invalid" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when phoneNumber is not E.164 format", async () => {
      const res = await request(app)
        .post("/auth/request-otp")
        .send({ phoneNumber: "5551234567" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/verify-otp", () => {
    it("returns 400 when phoneNumber is missing", async () => {
      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ otp: "123456" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when otp is missing", async () => {
      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phoneNumber: "+15551234567" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when otp is not 6 digits", async () => {
      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phoneNumber: "+15551234567", otp: "12345" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when otp contains non-numeric chars", async () => {
      const res = await request(app)
        .post("/auth/verify-otp")
        .send({ phoneNumber: "+15551234567", otp: "12345a" });
      expect(res.status).toBe(400);
    });
  });
});
