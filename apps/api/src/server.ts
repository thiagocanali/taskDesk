import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 3000);
const host = process.env.API_HOST ?? "127.0.0.1";

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("API_PORT must be an integer between 1 and 65535.");
}

const app = createApp();

app.listen(port, host, () => {
  console.info(`taskDesk API listening on http://${host}:${port}`);
});
