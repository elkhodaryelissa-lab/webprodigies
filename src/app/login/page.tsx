'use client'

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function Page() {
  const { signInForm, handleSignIn, handleGoogleSignIn, isLoading } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = signInForm

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSignIn)}
          onGoogleSignIn={handleGoogleSignIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}