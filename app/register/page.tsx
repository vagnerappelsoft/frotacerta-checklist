import { RegisterScreen } from "@/components/register-screen"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Registro - Checklist Veicular",
  description: "Crie uma nova conta para acessar o sistema de checklist veicular",
}

export default function RegisterPage() {
  return <RegisterScreen />
}
