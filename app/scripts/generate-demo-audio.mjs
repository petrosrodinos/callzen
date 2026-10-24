// Generates the landing-page demo voices into public/demo/line-<id>.mp3 with OpenAI text-to-speech.
// Usage: OPENAI_API_KEY=sk-... npm run demo:audio
import { mkdir, readFile, writeFile } from "node:fs/promises";

const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("Set OPENAI_API_KEY first.");

const lines = JSON.parse(await readFile(new URL("../src/pages/landing/demo/demo-lines.json", import.meta.url), "utf8"));
const outDir = new URL("../public/demo/", import.meta.url);
await mkdir(outDir, { recursive: true });

const VOICES = {
  USER: { voice: "ash", instructions: "A confident, warm sales rep on a phone call. Natural pace, friendly, not salesy." },
  PROSPECT: { voice: "coral", instructions: "A busy head of operations on a call. Slightly guarded, direct, natural pace." },
};

for (const line of lines) {
  const { voice, instructions } = VOICES[line.speaker];
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: line.text, instructions, response_format: "mp3" }),
  });
  if (!response.ok) throw new Error(`Line ${line.id}: ${response.status} ${await response.text()}`);
  await writeFile(new URL(`line-${line.id}.mp3`, outDir), Buffer.from(await response.arrayBuffer()));
  console.log(`line-${line.id}.mp3`);
}
