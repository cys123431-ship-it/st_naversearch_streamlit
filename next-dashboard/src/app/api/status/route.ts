import { NextResponse } from "next/server";
import { getNaverCredentials } from "@/lib/naver";

export async function GET() {
  const creds = getNaverCredentials();

  return NextResponse.json({
    ready: creds.isReady,
    source: creds.source,
  });
}
