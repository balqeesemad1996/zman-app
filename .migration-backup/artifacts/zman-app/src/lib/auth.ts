export const SESSION_KEY = "zman_session";

export function isAuthenticated(): boolean {
  try {
    return !!localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
}

export async function login(passcode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) {
      localStorage.setItem(SESSION_KEY, passcode);
      return { success: true };
    }
    const data = await res.json().catch(() => ({})) as { error?: string };
    return { success: false, error: data.error || "رمز الدخول غير صحيح" };
  } catch {
    return { success: false, error: "فشل الاتصال بالسيرفر" };
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
