import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET user by ID
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(id);
    
    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = (user.user_metadata || {}) as Record<string, unknown>;
    
    // Get additional data from users table
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("is_active, work_status, avatar_url")
      .eq("id", id)
      .single();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: meta.first_name || "",
      lastName: meta.last_name || "",
      role: meta.role || "staff",
      designation: meta.designation || "",
      avatar_url: dbUser?.avatar_url || meta.avatar_url || null,
      is_active: dbUser?.is_active ?? true,
      work_status: dbUser?.work_status || "available",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PATCH update user
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { firstName, lastName, role, designation, is_active, avatar_url } = body;

    // Update auth user metadata
    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (role !== undefined) updateData.role = role;
    if (designation !== undefined) updateData.designation = designation;

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: updateData,
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
    }

    // Update users table
    const dbUpdate: Record<string, unknown> = {};
    if (role !== undefined) dbUpdate.role = role;
    if (designation !== undefined) dbUpdate.designation = designation;
    if (is_active !== undefined) dbUpdate.is_active = is_active;
    if (avatar_url !== undefined) dbUpdate.avatar_url = avatar_url;
    if (firstName !== undefined || lastName !== undefined) {
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      dbUpdate.full_name = fullName || null;
    }

    if (Object.keys(dbUpdate).length > 0) {
      const { error: dbError } = await supabaseAdmin
        .from("users")
        .update(dbUpdate)
        .eq("id", id);

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
    }

    // Revalidate the users page to reflect changes
    revalidatePath("/users");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE user (deactivate, not actually delete)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Soft delete - just deactivate the user
    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Revalidate the users page to reflect changes
    revalidatePath("/users");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
