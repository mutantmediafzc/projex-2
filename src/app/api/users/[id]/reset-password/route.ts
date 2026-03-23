import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifySession(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || request.cookies.get("sb-access-token")?.value;
  
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        if (parsed?.[0]?.access_token) {
          const { data } = await supabaseAdmin.auth.getUser(parsed[0].access_token);
          return data.user;
        }
      } catch {}
    }
    return null;
  }
  
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user;
}

// POST reset user password to "000000"
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: targetUserId } = await context.params;
    
    // Verify the requesting user is an admin
    const currentUser = await verifySession(request);
    
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if current user is admin
    const currentUserMeta = (currentUser.user_metadata || {}) as Record<string, unknown>;
    const isAdmin = currentUserMeta.role === "admin";
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can reset passwords" }, { status: 403 });
    }
    
    // Prevent admin from resetting their own password this way
    if (currentUser.id === targetUserId) {
      return NextResponse.json({ error: "Cannot reset your own password. Use the profile page instead." }, { status: 400 });
    }
    
    // Reset the target user's password to "000000"
    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: "000000",
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ success: true, message: "Password reset to 000000" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
