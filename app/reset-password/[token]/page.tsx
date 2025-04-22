import { ResetPasswordScreen } from "@/components/reset-password-screen"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Redefinir Senha - Checklist Veicular",
  description: "Redefina sua senha para acessar o sistema de checklist veicular",
}

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return <ResetPasswordScreen token={params.token} />
}
