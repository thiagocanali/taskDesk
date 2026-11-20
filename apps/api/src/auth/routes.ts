import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { InvalidCredentials, normalizeEmail, registerUser, signInUser } from "./credentials.js";
import { revokeSession, verifySession } from "./sessions.js";

const WINDOW_MS=15*60*1000;
const MAX_ATTEMPTS=10;
const MAX_BUCKETS=10000;

export function createAuthRouter(prisma: PrismaClient, options = {
 allowRegistration: process.env.AUTH_ALLOW_REGISTRATION === "true",
}) {
 const router=Router();
 const attempts=new Map<string,{count:number,until:number}>();
 router.use((request,response,next)=>{
  // Logout must remain available even after a client exhausts its sign-in budget.
  if (request.method!=="POST" || (request.path!=="/login" && request.path!=="/register")) return next();
  const now=Date.now();
  if (attempts.size>=MAX_BUCKETS) for(const [key,value] of attempts) if(value.until<=now) attempts.delete(key);
  const key=request.ip ?? "unknown";
  const previous=attempts.get(key);
  if(previous && previous.until>now && previous.count>=MAX_ATTEMPTS){
   response.setHeader("Retry-After",String(Math.ceil((previous.until-now)/1000)));
   response.status(429).json({error:"Muitas tentativas. Tente novamente mais tarde."});
   return;
  }
  if(attempts.size>=MAX_BUCKETS && !attempts.has(key)) {
   response.status(429).json({error:"Muitas tentativas. Tente novamente mais tarde."});
   return;
  }
  attempts.set(key,{count:(previous && previous.until>now ? previous.count:0)+1,until:previous && previous.until>now?previous.until:now+WINDOW_MS});
  next();
 });
 router.post("/register",async(request,response)=>{
  if (!options.allowRegistration) {
   response.status(403).json({error:"O cadastro de contas está indisponível."});return;
  }
  const {email,password}=request.body ?? {};
  if(typeof email!=="string" || typeof password!=="string"){
   response.status(400).json({error:"Dados inválidos."});return;
  }
  try{
   const user=await registerUser(prisma,email,password);
   response.status(201).json({data:user});
  }catch(error){
   if(error instanceof InvalidCredentials){response.status(400).json({error:"Dados inválidos."});return;}
   if(typeof error==="object" && error!==null && "code" in error && error.code==="P2002"){
    response.status(409).json({error:"Não foi possível cadastrar este e-mail."});return;
   }
   throw error;
  }
 });
 router.post("/login",async(request,response)=>{
  const {email,password}=request.body ?? {};
  if(typeof email!=="string" || typeof password!=="string" || normalizeEmail(email).length>320){
   response.status(401).json({error:"Credenciais inválidas."});return;
  }
  try{
   const session=await signInUser(prisma,email,password);
   response.status(200).json({data:session});
  }catch(error){
   if(error instanceof InvalidCredentials){response.status(401).json({error:"Credenciais inválidas."});return;}
   throw error;
  }
 });
 router.get("/me",async(request,response)=>{
  const match=/^Bearer ([^\s]+)$/i.exec(request.get("Authorization") ?? "");
  const identity=match?await verifySession(prisma,match[1]):null;
  if(!identity){response.status(401).json({error:"Sessão inválida."});return;}
  const user=await prisma.authUser.findUnique({where:{id:identity.id},select:{id:true,email:true}});
  if(!user){response.status(401).json({error:"Sessão inválida."});return;}
  response.json({data:user});
 });
 router.post("/logout",async(request,response)=>{
  const match=/^Bearer ([^\s]+)$/i.exec(request.get("Authorization") ?? "");
  if(match) await revokeSession(prisma,match[1]);
  response.status(204).end();
 });
 return router;
}
