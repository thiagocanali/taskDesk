import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export interface RequestLog {
 event: "http_request";
 requestId: string;
 method: string;
 route: string;
 status: number | null;
 durationMs: number;
 outcome: "completed" | "aborted";
}
export type RequestLogger = (entry: RequestLog) => void;
const METHODS = new Set(["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"]);

export function requestObservability(
 log: RequestLogger = entry => console.info(JSON.stringify(entry)),
): RequestHandler {
 return (request,response,next) => {
  // Never trust caller IDs or forward arbitrary strings into logs.
  const requestId = randomUUID();
  const started = performance.now();
  response.setHeader("X-Request-ID",requestId);
  let recorded = false;
  const record = (outcome: RequestLog["outcome"]) => {
   if (recorded) return;
   recorded = true;
   const route = typeof request.route?.path === "string" ? request.route.path : "unmatched";
   const entry: RequestLog = {
    event:"http_request", requestId,
    method:METHODS.has(request.method)?request.method:"OTHER",
    // Express's registered route template, never req.url/path/query or user IDs.
    route, status:outcome==="completed"?response.statusCode:null,
    durationMs:Math.max(0,Math.round((performance.now()-started)*1000)/1000),
    outcome,
   };
   // Observability is best effort and must not break the request or process.
   try { log(entry); } catch { /* Never serialize the logging failure or request. */ }
  };
  response.once("finish",()=>record("completed"));
  response.once("close",()=>record(response.writableFinished?"completed":"aborted"));
  next();
 };
}
