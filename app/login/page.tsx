import { LoginScreen } from "@/components/login-screen"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login - Checklist Veicular",
  description: "Faça login para acessar o sistema de checklist veicular",
}

export default function LoginPage() {
  return <LoginScreen />
}
