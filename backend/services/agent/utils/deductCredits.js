import axios from "axios";

export async function deductCredits({ userId, sessionId, agent }) {
  const billingServiceUrl =
    process.env.BILLING_SERVICE || "http://localhost:8004";

  const { data } = await axios.post(
    `${billingServiceUrl}/deduct`,
    { agent },
    {
      headers: {
        "x-user-id": userId,
        "x-session-id": sessionId,
      },
    },
  );

  return data;
}
