import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm className="animate-in fade-in slide-in-from-bottom-6 duration-500" />
    </AuthLayout>
  );
}