import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifySession() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Find Supabase auth token cookie (format: sb-{project-ref}-auth-token)
    const authCookie = allCookies.find(c => c.name.match(/^sb-.*-auth-token$/));
    
    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie.value));
        const accessToken = parsed?.[0]?.access_token || parsed?.access_token;
        if (accessToken) {
          const { data } = await supabaseAdmin.auth.getUser(accessToken);
          return data.user;
        }
      } catch (e) {
        console.error("Failed to parse auth cookie:", e);
      }
    }
    
    // Also try base64 encoded format
    const base64Cookie = allCookies.find(c => c.name.match(/^sb-.*-auth-token-code-verifier$/));
    if (!authCookie && base64Cookie) {
      // Try alternate cookie patterns
      for (const cookie of allCookies) {
        if (cookie.name.includes('auth') && cookie.name.startsWith('sb-')) {
          try {
            const decoded = decodeURIComponent(cookie.value);
            const parsed = JSON.parse(decoded);
            const token = parsed?.[0]?.access_token || parsed?.access_token;
            if (token) {
              const { data } = await supabaseAdmin.auth.getUser(token);
              if (data.user) return data.user;
            }
          } catch {}
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

// POST reset user password to "000000"
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: targetUserId } = await context.params;
    
    // Verify the requesting user is an admin
    const currentUser = await verifySession();
    
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
