import { createApp } from "../../api/dist/app.js";

// A single application/Prisma pool is reused across warm function invocations.
export default createApp();
