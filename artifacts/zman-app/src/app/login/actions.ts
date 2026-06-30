"use server";

import { cookies } from "next/headers";

export async function loginAction(passcode: string) {
  const expectedPasscode = process.env.PASSCODE;
  if (!expectedPasscode) {
    return { success: false, error: "خطأ في إعدادات الخادم" };
  }
  if (passcode === expectedPasscode) {
    const cookieStore = await cookies();
    cookieStore.set("zman_session", passcode, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return { success: true };
  }
  return { success: false, error: "رمز الدخول غير صحيح" };
}
