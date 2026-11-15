import { createRequire } from "node:module";
import "dotenv/config";

// NOTE: this file used to contain a hardcoded bot token and started a bot on import. The token must be
// revoked in @BotFather (it was shared in a zip) and supplied through TELEGRAM_BOT_TOKEN instead.
const require = createRequire(import.meta.url);

/** Creates the Telegram bot on demand. Requires `npm i node-telegram-bot-api`. */
export function createTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

  const TelegramBot = require("node-telegram-bot-api");
  const bot = new TelegramBot(token);

  bot.onText(/\/start/, (msg: any) => {
    bot.sendMessage(msg.chat.id, "Hello! Your Node.js Telegram bot is connected successfully.");
  });

  bot.on("message", (msg: any) => {
    const text = msg.text;
    if (!text || text.startsWith("/")) return;
    bot.sendMessage(msg.chat.id, `You sent: ${text}`);
  });

  return bot;
}
