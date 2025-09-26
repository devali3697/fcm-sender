import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.FCM_PROJECT_ID;
const SVC_EMAIL  = process.env.FCM_SA_CLIENT_EMAIL;
const SVC_KEY    = process.env.FCM_SA_PRIVATE_KEY?.replace(/\\n/g, '\n');

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { token, title = "JWeight Chart", body = "Instant", data = {} } = req.body || {};
    if (!token) return res.status(400).json({ error: "token required" });

    const auth = new GoogleAuth({
      credentials: { client_email: SVC_EMAIL, private_key: SVC_KEY },
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const fcmBody = {
      message: {
        token,
        android: { priority: "HIGH", ttl: "300s" },
        data: { title, body, ...Object.fromEntries(Object.entries(data).map(([k,v]) => [k,String(v)])) }
      }
    };

    const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken.token || accessToken}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify(fcmBody)
    });

    const text = await resp.text();
    if (!resp.ok) return res.status(resp.status).send(text);
    return res.status(200).send(text);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
