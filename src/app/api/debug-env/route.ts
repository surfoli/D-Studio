import { NextResponse } from "next/server";
import { loadEnv } from "@/lib/load-env";
loadEnv();

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyInEnv: "ANTHROPIC_API_KEY" in process.env,
    keyLength: key?.length ?? 0,
    keyRaw: JSON.stringify(key?.slice(0, 8)),
    nodeEnv: process.env.NODE_ENV,
    e2b: !!process.env.E2B_API_KEY,
    e2bLength: process.env.E2B_API_KEY?.length ?? 0,
  });
}
