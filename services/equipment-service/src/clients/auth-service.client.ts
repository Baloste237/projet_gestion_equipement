const authServiceUrl = () => process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const TIMEOUT_MS = 5_000;

export const authServiceClient = {
  verifyPassword: async (authorization: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${authServiceUrl()}/auth/verify-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return response.ok;
    } catch (err) {
      console.error("[authServiceClient] verifyPassword error:", err);
      return false;
    }
  },
};
