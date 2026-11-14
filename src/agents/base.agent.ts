import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getSkills, type TaskType } from "../skills/manger/skills-manger.js";

// ===============================
// MODEL CONFIGURATION
// ===============================

const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.1-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  temperature: 0.7,
});

// ===============================
// RATE LIMIT CONFIGURATION
// ===============================

const MAX_RPM = 10;
const MAX_RPD = 1000;

const REQUEST_DELAY = 6000;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// ===============================
// RATE LIMIT TRACKING
// ===============================

let lastRequestTime = 0;

const requestsThisMinute: number[] = [];
const requestsToday: number[] = [];

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ===============================
// RATE LIMIT HANDLER
// ===============================

async function waitForRateLimit(): Promise<void> {
  while (true) {
    const now = Date.now();

    // Clean expired RPM requests.
    while (
      requestsThisMinute.length > 0 &&
      now - requestsThisMinute[0]! >= MINUTE
    ) {
      requestsThisMinute.shift();
    }

    // Clean expired RPD requests.
    while (requestsToday.length > 0 && now - requestsToday[0]! >= DAY) {
      requestsToday.shift();
    }

    // Check daily quota.
    if (requestsToday.length >= MAX_RPD) {
      const oldestRequest = requestsToday[0]!;

      const waitTime = DAY - (now - oldestRequest);

      console.log(
        `Daily quota reached. Waiting ${Math.ceil(waitTime / 1000)} seconds.`,
      );

      await delay(waitTime);
      continue;
    }

    // Check RPM quota.
    if (requestsThisMinute.length >= MAX_RPM) {
      const oldestRequest = requestsThisMinute[0]!;

      const waitTime = MINUTE - (now - oldestRequest);

      console.log(
        `RPM limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds.`,
      );

      await delay(waitTime);
      continue;
    }

    // Check minimum request delay.
    const elapsed = now - lastRequestTime;

    if (elapsed < REQUEST_DELAY) {
      await delay(REQUEST_DELAY - elapsed);
      continue;
    }

    // Register request.
    const requestTime = Date.now();

    requestsThisMinute.push(requestTime);
    requestsToday.push(requestTime);

    lastRequestTime = requestTime;

    return;
  }
}

// ===============================
// AGENT CONFIGURATION
// ===============================

interface AgentConfig {
  name: string;
  role: string;
  task: TaskType;
}

// ===============================
// RUN AGENT
// ===============================

export async function runAgent(
  config: AgentConfig,
  input: string,
): Promise<string> {
  console.log(`\n🚀 Starting Agent: ${config.name}`);

  // Step 1: Load skills
  console.time(`${config.name} - Skills`);

  const skills = await getSkills(config.task);

  console.timeEnd(`${config.name} - Skills`);

  // Step 2: Rate limit
  console.log(`⏳ ${config.name}: Checking rate limits...`);

  await waitForRateLimit();

  // Step 3: Gemini request
  console.log(`🤖 ${config.name}: Sending request to Gemini...`);

  console.time(`${config.name} - Gemini`);

  try {
    const response = await model.invoke([
      {
        role: "system",
        content: `
You are ${config.name}.

YOUR ROLE:
${config.role}

YOUR SPECIALIZED KNOWLEDGE:

Follow the filmmaking methodologies,
instructions and workflows provided below.

ACTIVE SKILLS:
${skills}

RULES:
- Follow your assigned role.
- Use the supplied skills.
- Do not perform another agent's responsibilities.
- Produce structured, useful outputs.
- Do not invent information when clarification is needed.
`,
      },
      {
        role: "user",
        content: input,
      },
    ]);

    console.timeEnd(`${config.name} - Gemini`);

    console.log(`✅ ${config.name}: Completed successfully`);

    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch (error) {
    console.timeEnd(`${config.name} - Gemini`);

    console.error(`❌ Agent ${config.name} failed:`, error);

    throw error;
  }
}
