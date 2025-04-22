import { ForgotPasswordScreen } from "@/components/forgot-password-screen"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Recuperar Senha - Checklist Veicular",
  description: "Recupere sua senha para acessar o sistema de checklist veicular",
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />
}
