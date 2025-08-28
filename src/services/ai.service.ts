import fs from "fs";
import path from "path";
import { env } from "../config/env";

export type AIClassifyResult = {
  label: string;
  category?: string;
  brand?: string;
  confidence?: number;
  meta?: Record<string, unknown>;
};

export async function callAIClassify(imageInput: string | Buffer): Promise<AIClassifyResult> {
  if (!env.openaiApiKey) {
    // fallback if missing key
    const label = typeof imageInput === 'string' ? path.basename(imageInput) : 'unknown_image';
    return {
      label,
      category: "Unknown",
      brand: undefined,
      confidence: 0.0,
      meta: { warning: "OPENAI_API_KEY not set - returning fallback" }
    };
  }

  let base64: string;
  if (typeof imageInput === 'string') {
    // Nếu là file path
    const imageBytes = await fs.promises.readFile(imageInput);
    base64 = imageBytes.toString("base64");
  } else {
    // Nếu là buffer
    base64 = imageInput.toString("base64");
  }

  const systemPrompt = `Bạn là trợ lý nhận dạng thiết bị phòng gym. Trả về JSON với các trường:
  - label: tên thiết bị
  - category: nhóm thiết bị (Cardio, Strength, ...)
  - brand: hãng sản xuất (nếu suy luận được)
  - confidence: số từ 0..1 về độ tự tin
  - meta: object tùy ý (các bộ phận, gợi ý sử dụng, ...)
  Chỉ trả về JSON hợp lệ, không kèm giải thích.`;

  const userPrompt = `Nhận dạng thiết bị trong ảnh và điền các trường yêu cầu.`;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.aiModel,
      input: [
        {
          role: "system",
          content: [ { type: "input_text", text: systemPrompt } ]
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: userPrompt },
            { type: "input_image", image_url: `data:image/jpeg;base64,${base64}` }
          ]
        }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const label = typeof imageInput === 'string' ? path.basename(imageInput) : 'unknown_image';
    return { label, meta: { error: errText } };
  }

  const json = await resp.json();
  const output = json.output?.[0];
  const content = output && output.content;
  const textItem = Array.isArray(content) ? content.find((c: any) => c.type === "output_text") : undefined;
  const text = textItem?.text || (typeof content === "string" ? content : undefined) || "{}";

  let parsed: AIClassifyResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    const label = typeof imageInput === 'string' ? path.basename(imageInput) : 'unknown_image';
    parsed = { label, meta: { raw: text } } as AIClassifyResult;
  }

  if (!parsed.label) {
    parsed.label = typeof imageInput === 'string' ? path.basename(imageInput) : 'unknown_image';
  }
  return parsed;
}
