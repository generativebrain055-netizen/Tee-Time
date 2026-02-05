module.exports = {
  testEnvironment: "node",
  watchman: false,
  testMatch: ["**/__tests__/**/*.test.js"],
  setupFiles: ["./jest.setup.js"],
  verbose: true,
  forceExit: true,
  testTimeout: 10000,
};
