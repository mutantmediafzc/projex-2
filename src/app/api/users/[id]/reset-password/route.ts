import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST reset user password to "000000"
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: targetUserId } = await context.params;
    
    // Verify the requesting user is an admin
    const cookieStore = await cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
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
