"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

type FeatureStatus = "working" | "partial" | "development" | "planned";
type FeatureCategory = "core" | "projects" | "social" | "communication" | "ai" | "admin" | "analytics";

interface Feature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  status: FeatureStatus;
  icon: React.ReactNode;
  subFeatures?: { name: string; status: FeatureStatus }[];
}

const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; bg: string; ring: string }> = {
  working: { label: "Fully Operational", color: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-200" },
  partial: { label: "Partially Complete", color: "text-amber-600", bg: "bg-amber-500", ring: "ring-amber-200" },
  development: { label: "In Development", color: "text-blue-600", bg: "bg-blue-500", ring: "ring-blue-200" },
  planned: { label: "Planned", color: "text-slate-500", bg: "bg-slate-400", ring: "ring-slate-200" },
};

const CATEGORY_CONFIG: Record<FeatureCategory, { label: string; color: string; gradient: string }> = {
  core: { label: "Core Platform", color: "text-violet-600", gradient: "from-violet-500 to-purple-500" },
  projects: { label: "Project Management", color: "text-emerald-600", gradient: "from-emerald-500 to-teal-500" },
  social: { label: "Social Media", color: "text-pink-600", gradient: "from-pink-500 to-rose-500" },
  communication: { label: "Communication", color: "text-blue-600", gradient: "from-blue-500 to-indigo-500" },
  ai: { label: "AI & Automation", color: "text-amber-600", gradient: "from-amber-500 to-orange-500" },
  admin: { label: "Administration", color: "text-slate-600", gradient: "from-slate-500 to-gray-500" },
  analytics: { label: "Analytics & Reports", color: "text-cyan-600", gradient: "from-cyan-500 to-teal-500" },
};

const FEATURES: Feature[] = [
  // Core Platform
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Central hub with real-time statistics, task overview, project analytics, workflow completion rates, and team performance metrics.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11.5 12 4l8 7.5"/><path d="M5 10.5V20h4v-5h6v5h4v-9.5"/></svg>,
    subFeatures: [
      { name: "Project Statistics by Type", status: "working" },
      { name: "Workflow Completion Tracking", status: "working" },
      { name: "Team Task Leaderboard", status: "working" },
      { name: "Today's Appointments", status: "working" },
      { name: "Pending Tasks Overview", status: "working" },
      { name: "Unread Messages Counter", status: "working" },
    ],
  },
  {
    id: "auth",
    name: "Authentication & Security",
    description: "Secure user authentication with Supabase Auth, role-based access control, and session management.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    subFeatures: [
      { name: "Email/Password Login", status: "working" },
      { name: "Role-Based Access Control", status: "working" },
      { name: "Admin-Only Pages", status: "working" },
      { name: "Session Persistence", status: "working" },
      { name: "User Profile Management", status: "working" },
    ],
  },
  {
    id: "search",
    name: "Global Search",
    description: "Unified search across companies, contacts, projects, and more with instant results.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  },
  {
    id: "notifications",
    name: "Notifications System",
    description: "Real-time notifications for mentions, task assignments, and system updates.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
    subFeatures: [
      { name: "Task Notifications", status: "working" },
      { name: "@Mention Notifications", status: "working" },
      { name: "Unread Message Badge", status: "working" },
    ],
  },
  // Companies & Contacts
  {
    id: "companies",
    name: "Company Management",
    description: "Comprehensive company database with industry categorization, contact linking, and project associations.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>,
    subFeatures: [
      { name: "Company CRUD Operations", status: "working" },
      { name: "Logo Upload", status: "working" },
      { name: "Industry Categorization", status: "working" },
      { name: "Contact Linking", status: "working" },
      { name: "Project Association", status: "working" },
      { name: "Company Merge", status: "partial" },
    ],
  },
  {
    id: "contacts",
    name: "Contact Management",
    description: "Centralized contact database with company association, communication history, and role tracking.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  // Project Management
  {
    id: "projects",
    name: "Project Management",
    description: "Full project lifecycle management from initiation to delivery with status tracking, value estimation, and team assignment.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>,
    subFeatures: [
      { name: "Project Creation & Editing", status: "working" },
      { name: "Status Tracking", status: "working" },
      { name: "Project Types (Website, Mobile, CRM, Marketing)", status: "working" },
      { name: "Value & Financial Tracking (Admin Only)", status: "working" },
      { name: "Due Date Management", status: "working" },
      { name: "Company & Contact Linking", status: "working" },
      { name: "Project Archive", status: "working" },
      { name: "Project Merge", status: "partial" },
      { name: "Project Delete", status: "development" },
    ],
  },
  {
    id: "workflows",
    name: "Project Workflows",
    description: "Customizable workflow templates for different project types with step-by-step progress tracking.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    subFeatures: [
      { name: "Website Project Workflow", status: "working" },
      { name: "Mobile App Workflow", status: "working" },
      { name: "Marketing Workflow", status: "working" },
      { name: "Step-by-Step Progress", status: "working" },
      { name: "File Uploads per Step", status: "working" },
      { name: "Step Comments & @Mentions", status: "working" },
      { name: "User Assignment per Step", status: "working" },
      { name: "Review Status Tracking", status: "working" },
      { name: "Mark Incomplete Functionality", status: "working" },
    ],
  },
  {
    id: "design-workflows",
    name: "Design Workflows",
    description: "Specialized workflows for design projects with revision tracking and approval stages.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10"/><path d="m4.22 4.22 4.24 4.24m7.08 7.08 4.24 4.24"/><path d="M1 12h6m6 0h10"/><path d="m4.22 19.78 4.24-4.24m7.08-7.08 4.24-4.24"/></svg>,
  },
  {
    id: "tasks",
    name: "Task Management",
    description: "Comprehensive task system with assignment, due dates, status tracking, and project linking.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    subFeatures: [
      { name: "Task Creation & Assignment", status: "working" },
      { name: "Due Date Tracking", status: "working" },
      { name: "Status Updates", status: "working" },
      { name: "Project Linking", status: "working" },
      { name: "Task Detail Modal", status: "working" },
      { name: "Task Notifications", status: "working" },
    ],
  },
  {
    id: "notes",
    name: "Project Notes",
    description: "Rich text notes with @mentions, timestamps, and activity tracking within projects.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>,
    subFeatures: [
      { name: "Rich Text Notes", status: "working" },
      { name: "@Mention Support", status: "working" },
      { name: "Activity Timestamps", status: "working" },
    ],
  },
  {
    id: "documents",
    name: "Document Management",
    description: "File upload, organization, and preview system for project documents.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>,
    subFeatures: [
      { name: "File Upload", status: "working" },
      { name: "File Preview Modal", status: "working" },
      { name: "Folder Organization", status: "working" },
      { name: "Download Files", status: "working" },
    ],
  },
  // Financials
  {
    id: "financials",
    name: "Financial Management",
    description: "Complete financial tracking with invoices, quotes, payment status, and revenue analytics.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    subFeatures: [
      { name: "Invoice Creation", status: "working" },
      { name: "Quote Management", status: "working" },
      { name: "Payment Status Tracking", status: "working" },
      { name: "PDF Generation", status: "working" },
      { name: "Revenue Dashboard", status: "working" },
      { name: "Project Value Tracking", status: "working" },
    ],
  },
  {
    id: "accounts",
    name: "Accounts Management",
    description: "Financial accounts overview with balance tracking and transaction history.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  // Social Media
  {
    id: "social-projects",
    name: "Social Media Projects",
    description: "Dedicated social media project management with brand guidelines, content strategy, and multi-platform support.",
    category: "social",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>,
    subFeatures: [
      { name: "Multi-Platform Support", status: "working" },
      { name: "Brand Color Customization", status: "working" },
      { name: "Company Association", status: "working" },
      { name: "Client Access Portal", status: "working" },
    ],
  },
  {
    id: "content-calendar",
    name: "Content Calendar",
    description: "Visual content planning calendar with drag-and-drop scheduling, post preview, and multi-platform publishing.",
    category: "social",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    subFeatures: [
      { name: "Calendar View", status: "working" },
      { name: "List View", status: "working" },
      { name: "Post Scheduling", status: "working" },
      { name: "Multi-Platform Posts", status: "working" },
      { name: "Image Asset Upload", status: "working" },
      { name: "Post Status Tracking", status: "working" },
      { name: "Workflow Status", status: "working" },
      { name: "Filter by Date Range", status: "partial" },
      { name: "Edit Post Details", status: "partial" },
    ],
  },
  {
    id: "article-planner",
    name: "Article Planner",
    description: "Blog and article content planning with SEO optimization and publishing workflow.",
    category: "social",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>,
  },
  {
    id: "analytics-kpi",
    name: "Social Analytics & KPIs",
    description: "Performance tracking with custom KPIs, engagement metrics, and growth analytics.",
    category: "social",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    subFeatures: [
      { name: "Platform-Specific KPIs", status: "working" },
      { name: "Monthly Targets", status: "working" },
      { name: "Achievement Tracking", status: "working" },
      { name: "Spend Management", status: "working" },
    ],
  },
  {
    id: "quarterly-reports",
    name: "Quarterly Reports",
    description: "Automated quarterly performance reports with visual analytics and export options.",
    category: "social",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  },
  // Communication
  {
    id: "dischat",
    name: "Dischat (Team Communication)",
    description: "Discord-style team communication with servers, channels, threads, and real-time messaging.",
    category: "communication",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
    subFeatures: [
      { name: "Server Creation", status: "working" },
      { name: "Channel Management", status: "working" },
      { name: "Real-time Messaging", status: "working" },
      { name: "Message Reactions", status: "working" },
      { name: "File Attachments", status: "working" },
      { name: "Thread Replies", status: "working" },
      { name: "User Invitations", status: "working" },
      { name: "Voice/Video Calls", status: "partial" },
      { name: "Server Settings", status: "working" },
    ],
  },
  {
    id: "messages",
    name: "Messages & Mentions",
    description: "Centralized inbox for all @mentions across notes, comments, and workflow steps.",
    category: "communication",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    subFeatures: [
      { name: "Project Note Mentions", status: "working" },
      { name: "Task Comment Mentions", status: "working" },
      { name: "Workflow Step Mentions", status: "working" },
      { name: "Mark as Read", status: "working" },
    ],
  },
  {
    id: "chat-colton",
    name: "Chat with Colton (AI Assistant)",
    description: "AI-powered assistant for project queries, task suggestions, and general help.",
    category: "ai",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4v4"/><path d="M12 8h8"/><circle cx="8" cy="16" r="6"/></svg>,
  },
  {
    id: "support-chat",
    name: "Support Chat",
    description: "Built-in support chat widget for user assistance and issue reporting.",
    category: "communication",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>,
  },
  // Tools
  {
    id: "danote",
    name: "Danote (Whiteboard)",
    description: "Interactive whiteboard for brainstorming, wireframing, and collaborative ideation with real-time sync.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    subFeatures: [
      { name: "Sticky Notes", status: "working" },
      { name: "Shapes & Lines", status: "working" },
      { name: "Text Elements", status: "working" },
      { name: "Image Upload", status: "working" },
      { name: "Drag & Drop", status: "working" },
      { name: "Board Management", status: "working" },
      { name: "Project Linking", status: "working" },
      { name: "Comments", status: "working" },
    ],
  },
  {
    id: "motion",
    name: "Motion (Animation Tool)",
    description: "Animation and motion graphics planning tool for creative projects.",
    category: "projects",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>,
  },
  {
    id: "calendar",
    name: "Appointments Calendar",
    description: "Team calendar for meetings, appointments, and event scheduling.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    subFeatures: [
      { name: "Event Creation", status: "working" },
      { name: "Contact Association", status: "working" },
      { name: "Multiple Views", status: "working" },
    ],
  },
  // User Management
  {
    id: "users",
    name: "User Management",
    description: "Team member management with role assignment, status tracking, and account activation.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    subFeatures: [
      { name: "User Listing", status: "working" },
      { name: "Role Assignment", status: "working" },
      { name: "Work Status Tracking", status: "working" },
      { name: "Edit User Profiles", status: "working" },
      { name: "Activate/Deactivate Users", status: "working" },
      { name: "Add New Members", status: "working" },
    ],
  },
  {
    id: "profile",
    name: "User Profile",
    description: "Personal profile management with photo upload, password change, and preferences.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>,
    subFeatures: [
      { name: "Profile Photo Upload & Crop", status: "working" },
      { name: "Password Change", status: "working" },
      { name: "Personal Info Update", status: "working" },
    ],
  },
  {
    id: "status",
    name: "User Status",
    description: "Work status indicator (Available, On Leave, WFH) with automatic prompts.",
    category: "core",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  },
  {
    id: "leaves",
    name: "Leave Management",
    description: "Leave requests, approvals, and calendar integration for team availability.",
    category: "admin",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
    subFeatures: [
      { name: "Leave Requests", status: "working" },
      { name: "AI Leave Recommendations", status: "working" },
    ],
  },
  // Reports
  {
    id: "ws-reports",
    name: "WS Reports",
    description: "Website and system performance reports with credit tracking.",
    category: "analytics",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    id: "performance-marketing",
    name: "Performance Marketing",
    description: "Marketing campaign performance tracking and analytics dashboard.",
    category: "analytics",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
  },
  // AI Features
  {
    id: "ai-scope",
    name: "AI Technical Scope Generation",
    description: "Automatically generate technical scope documents from project briefs using AI.",
    category: "ai",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2Z"/><path d="M21.17 8H12V2.83a10 10 0 0 1 9.17 5.17Z"/></svg>,
  },
  {
    id: "ai-description",
    name: "AI Description Generation",
    description: "Generate content descriptions and captions using AI assistance.",
    category: "ai",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="M3 12h18"/><rect x="3" y="3" width="6" height="6" rx="1"/></svg>,
  },
  {
    id: "ai-daily-quote",
    name: "AI Daily Quote",
    description: "AI-generated motivational quotes for the team.",
    category: "ai",
    status: "working",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  },
  // Future AI Features
  {
    id: "ai-task-suggestions",
    name: "AI Task Suggestions",
    description: "Intelligent task recommendations based on project context, deadlines, and team capacity.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4"/><path d="m6.8 6.8 2.8 2.8"/><path d="M2 12h4"/><path d="m6.8 17.2 2.8-2.8"/><path d="M12 22v-4"/><path d="m17.2 17.2-2.8-2.8"/><path d="M22 12h-4"/><path d="m17.2 6.8-2.8 2.8"/></svg>,
    subFeatures: [
      { name: "Priority-Based Suggestions", status: "planned" },
      { name: "Workload Balancing", status: "planned" },
      { name: "Deadline Predictions", status: "planned" },
      { name: "Resource Optimization", status: "planned" },
    ],
  },
  {
    id: "ai-meeting-assistant",
    name: "AI Meeting Assistant",
    description: "AI-powered meeting facilitation with agenda suggestions, action items, and follow-ups.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect x="3" y="4" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="2"/><path d="M8 2v2"/><path d="M16 2v2"/></svg>,
    subFeatures: [
      { name: "Agenda Generation", status: "planned" },
      { name: "Meeting Prep Suggestions", status: "planned" },
      { name: "Action Item Extraction", status: "planned" },
      { name: "Follow-up Reminders", status: "planned" },
    ],
  },
  {
    id: "ai-meeting-recording",
    name: "AI Meeting Recording & Notes",
    description: "Automatic meeting recording with AI transcription, summaries, and searchable notes.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
    subFeatures: [
      { name: "Auto Recording", status: "planned" },
      { name: "AI Transcription", status: "planned" },
      { name: "Meeting Summaries", status: "planned" },
      { name: "Key Points Extraction", status: "planned" },
      { name: "Searchable Archives", status: "planned" },
    ],
  },
  {
    id: "fireflies-integration",
    name: "Fireflies.ai Integration",
    description: "Integration with Fireflies.ai for enhanced meeting intelligence and team insights.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
    subFeatures: [
      { name: "Meeting Sync", status: "planned" },
      { name: "Conversation Intelligence", status: "planned" },
      { name: "Team Analytics", status: "planned" },
      { name: "CRM Integration", status: "planned" },
    ],
  },
  {
    id: "ai-content-generator",
    name: "AI Content Generator",
    description: "Generate social media posts, blog articles, and marketing copy with AI.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
    subFeatures: [
      { name: "Post Generation", status: "planned" },
      { name: "Caption Suggestions", status: "planned" },
      { name: "Hashtag Recommendations", status: "planned" },
      { name: "Multi-Language Support", status: "planned" },
    ],
  },
  {
    id: "ai-analytics",
    name: "AI-Powered Analytics",
    description: "Predictive analytics and insights using machine learning for better decision making.",
    category: "ai",
    status: "planned",
    icon: <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>,
    subFeatures: [
      { name: "Trend Predictions", status: "planned" },
      { name: "Performance Forecasting", status: "planned" },
      { name: "Anomaly Detection", status: "planned" },
      { name: "Custom Insights", status: "planned" },
    ],
  },
];

export default function USPPage() {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

  const filteredFeatures = useMemo(() => {
    return FEATURES.filter(feature => {
      if (selectedCategory !== "all" && feature.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && feature.status !== selectedStatus) return false;
      if (searchQuery && !feature.name.toLowerCase().includes(searchQuery.toLowerCase()) && !feature.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [selectedCategory, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = FEATURES.length;
    const working = FEATURES.filter(f => f.status === "working").length;
    const partial = FEATURES.filter(f => f.status === "partial").length;
    const development = FEATURES.filter(f => f.status === "development").length;
    const planned = FEATURES.filter(f => f.status === "planned").length;
    return { total, working, partial, development, planned };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-6 py-12 mb-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 mb-6 backdrop-blur-sm border border-white/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Platform Overview
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Projex by <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Mutant</span>
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto mb-8">
            Complete project management and collaboration platform with integrated social media management, team communication, and AI-powered features.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-4 py-3">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/60">Total Features</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 px-4 py-3">
              <p className="text-3xl font-bold text-emerald-400">{stats.working}</p>
              <p className="text-xs text-emerald-300/70">Operational</p>
            </div>
            <div className="rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 px-4 py-3">
              <p className="text-3xl font-bold text-amber-400">{stats.partial + stats.development}</p>
              <p className="text-xs text-amber-300/70">In Progress</p>
            </div>
            <div className="rounded-xl bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 px-4 py-3">
              <p className="text-3xl font-bold text-blue-400">{stats.planned}</p>
              <p className="text-xs text-blue-300/70">Planned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | "all")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as FeatureStatus | "all")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-black focus:border-violet-300 focus:ring-2 focus:ring-violet-100 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFeatures.map((feature) => {
          const categoryConfig = CATEGORY_CONFIG[feature.category];
          const statusConfig = STATUS_CONFIG[feature.status];
          const isExpanded = expandedFeature === feature.id;
          
          return (
            <div
              key={feature.id}
              className={`group relative rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300 ${isExpanded ? "ring-2 ring-violet-200" : ""}`}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4 mb-3">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${categoryConfig.gradient} text-white shadow-lg`}>
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{feature.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.color} ${statusConfig.ring} ring-1`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.bg}`} />
                        {statusConfig.label}
                      </span>
                      <span className={`text-[10px] font-medium ${categoryConfig.color}`}>
                        {categoryConfig.label}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {feature.description}
                </p>
                
                {/* Sub-features */}
                {feature.subFeatures && feature.subFeatures.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                      className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      <svg className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                      {isExpanded ? "Hide" : "Show"} {feature.subFeatures.length} sub-features
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                        {feature.subFeatures.map((sub, idx) => {
                          const subStatus = STATUS_CONFIG[sub.status];
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-600">{sub.name}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${subStatus.color} ${subStatus.ring} ring-1`}>
                                <span className={`h-1 w-1 rounded-full ${subStatus.bg}`} />
                                {sub.status === "working" ? "✓" : sub.status === "partial" ? "◐" : sub.status === "development" ? "⚙" : "○"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Decorative gradient */}
              <div className={`absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r ${categoryConfig.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredFeatures.length === 0 && (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900">No features found</h3>
          <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-6 text-center">
        <p className="text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          This is an internal document showcasing all platform capabilities.
        </p>
        <Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
