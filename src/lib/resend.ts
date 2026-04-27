import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "Projex <notifications@projex-2.vercel.app>";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://projex-2.vercel.app";
