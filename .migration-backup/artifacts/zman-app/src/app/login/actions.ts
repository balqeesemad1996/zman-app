import { login } from "@/lib/auth";

export async function loginAction(passcode: string) {
  return login(passcode);
}
