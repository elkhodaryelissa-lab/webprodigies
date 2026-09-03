'use client'

import { SignupForm } from "@/components/signup-form"
import { useAuth } from "@/hooks/use-auth"

export default function Page() {
  const { signUpForm, handleSignUp, handleGoogleSignIn, isLoading } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = signUpForm

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm
          register={register}
          errors={errors}
          onSubmit={handleSubmit(handleSignUp)}
          onGoogleSignIn={handleGoogleSignIn}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
