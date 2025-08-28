import fs from "fs";
import path from "path";
import { env } from "../config/env";
import type { IWorkout } from "../modules/workouts/workout.model";

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

export type AIWorkoutAdvice = {
  summary: string;
  periodAnalyzed: string;
  strengths: string[];
  risks: string[];
  recommendations: Array<{
    goal: string;
    rationale: string;
    weeklyPlan: Array<{
      day: string;
      focus: string;
      exercises: Array<{ name: string; sets?: number; reps?: number; durationMin?: number; notes?: string }>;
    }>;
    recovery: string[];
    monitoring: string[];
  }>;
};

export async function callAIForWorkoutAdvice(workouts: Array<Pick<IWorkout, "items" | "startedAt" | "endedAt" | "gym">>): Promise<AIWorkoutAdvice> {
  if (!env.openaiApiKey) {
    return {
      summary: "OPENAI_API_KEY not set - returning fallback advice",
      periodAnalyzed: "N/A",
      strengths: [],
      risks: [],
      recommendations: []
    };
  }

  const compactWorkouts = workouts.map(w => ({
    startedAt: w.startedAt,
    endedAt: w.endedAt,
    gym: typeof (w as any).gym === "object" ? (w as any).gym?._id ?? (w as any).gym : (w as any).gym,
    items: w.items.map(i => ({
      equipment: (i as any).equipment?._id ?? (i as any).equipment,
      sets: i.sets,
      reps: i.reps,
      durationMin: i.durationMin,
      weightKg: i.weightKg,
      notes: i.notes
    }))
  }));

  const systemPrompt = `Bạn là chuyên gia khoa học thể thao. Phân tích lịch sử buổi tập (thiết bị, set, rep, thời lượng, khối lượng) để đưa ra nhận định dựa trên nguyên tắc khoa học (quá tải tuần tiến, phân bổ nhóm cơ, phục hồi, cardio/strength balance, kỹ thuật, chấn thương). Trả về JSON đúng schema yêu cầu, ngắn gọn, thực tế.`;

  const userPrompt = `Dữ liệu buổi tập (JSON) bên dưới. Hãy:
1) Tóm tắt xu hướng và cường độ chung trong khoảng thời gian.
2) Nêu điểm mạnh và rủi ro tiềm ẩn.
3) Đề xuất kế hoạch theo mục tiêu (ví dụ: tăng cơ, giảm mỡ, hiệu năng) gồm: weeklyPlan 3-5 ngày, recovery, monitoring. Chỉ trả JSON.`;

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.aiModel,
      input: [
        { role: "system", content: [ { type: "input_text", text: systemPrompt } ] },
        { role: "user", content: [ { type: "input_text", text: userPrompt + "\n\nWorkouts:" }, { type: "input_text", text: JSON.stringify(compactWorkouts) } ] }
      ],
      text: { format: { type: "json_object" } }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { summary: "AI error", periodAnalyzed: "unknown", strengths: [], risks: [errText], recommendations: [] };
  }

  const json = await resp.json();
  const output = json.output?.[0];
  const content = output && output.content;
  const textItem = Array.isArray(content) ? content.find((c: any) => c.type === "output_text") : undefined;
  const text = textItem?.text || (typeof content === "string" ? content : undefined) || "{}";

  try {
    const parsed = JSON.parse(text);
    return parsed as AIWorkoutAdvice;
  } catch {
    return { summary: "Could not parse AI response", periodAnalyzed: "unknown", strengths: [], risks: [], recommendations: [] };
  }
}
