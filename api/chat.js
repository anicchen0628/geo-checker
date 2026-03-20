import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.status(500).json({ error: "AWS credentials not configured" });
  }

  try {
    const { system, message, max_tokens } = req.body;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: max_tokens || 3000,
      system,
      messages: [{ role: "user", content: message }],
    };

    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    const text = result.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("");

    return res.status(200).json({ text });
  } catch (err) {
    console.error("Bedrock API error:", err);
    const msg = err.message || "Internal server error";
    return res.status(500).json({ error: msg });
  }
}
