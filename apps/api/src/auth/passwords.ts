import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
 new Promise((resolve,reject) => scryptCallback(password,salt,KEY_BYTES,PARAMETERS,(error,key) =>
  error ? reject(error) : resolve(key as Buffer)));
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MAX_PASSWORD_BYTES = 1024;
const PARAMETERS = {N:16384,r:8,p:1,maxmem:32*1024*1024};

export function validPassword(password: unknown): password is string {
 return typeof password==="string" && password.length>=12 && Buffer.byteLength(password,"utf8")<=MAX_PASSWORD_BYTES;
}

/** Store a versioned KDF hash; never store, log or return the password. */
export async function hashPassword(password: string): Promise<string> {
 if (!validPassword(password)) throw new Error("Invalid password length");
 const salt=randomBytes(SALT_BYTES);
 const derived=await derive(password,salt);
 return `scrypt-v1:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
 if (!validPassword(password)) return false;
 const parts=/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
 if (!parts) return false;
 const expected=Buffer.from(parts[2],"hex");
 const actual=await derive(password,Buffer.from(parts[1],"hex"));
 return timingSafeEqual(expected,actual);
}
