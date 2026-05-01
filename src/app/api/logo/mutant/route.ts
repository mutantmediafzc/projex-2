import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "logos", "mutant-logo.avif");
    const fileBuffer = fs.readFileSync(filePath);

    // Return the file with content-type — react-pdf will attempt to render it.
    // If AVIF still fails, this endpoint is a fallback so the URL is absolute.
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/avif",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
