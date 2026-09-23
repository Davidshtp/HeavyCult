"use client";

import { useState } from "react";
import { cn } from "cn";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-lg [perspective:1400px]">
      <div
        className={cn(
          "grid [transform-style:preserve-3d] transition-transform duration-700",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div
          className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:translateZ(0)]"
          aria-hidden={flipped}
        >
          <LoginForm onForgot={() => setFlipped(true)} />
        </div>
        <div
          className="col-start-1 row-start-1 [transform:rotateY(180deg)] [backface-visibility:hidden]"
          aria-hidden={!flipped}
        >
          <ForgotPasswordForm
            onBack={() => setFlipped(false)}
            onSuccess={() => setFlipped(false)}
          />
        </div>
      </div>
    </div>
  );
}