'use client'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import type { UseFormRegister, FieldErrors } from "react-hook-form"

type SignupFormValues = {
  firstName: string
  lastname: string
  email: string
  password: string
}

interface SignupFormProps
  extends Omit<React.ComponentProps<"div">, "onSubmit"> {
  register: UseFormRegister<SignupFormValues>
  errors: FieldErrors<SignupFormValues>
  onSubmit: React.FormEventHandler<HTMLFormElement>
  onGoogleSignIn: () => void
  isLoading: boolean
}

export function SignupForm({
  className,
  register,
  errors,
  onSubmit,
  onGoogleSignIn,
  isLoading,
  ...props
}: SignupFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastname">Last Name</FieldLabel>
                <Input
                  id="lastname"
                  type="text"
                  placeholder="Doe"
                  {...register("lastname")}
                />
                <FieldError errors={[errors.lastname]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                />
                <FieldDescription>
                  We&apos;ll use this to contact you. We will not share your
                  email with anyone else.
                </FieldDescription>
                <FieldError errors={[errors.email]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" {...register("password")} />
                <FieldDescription>
                  Must be at least 6 characters long.
                </FieldDescription>
                <FieldError errors={[errors.password]} />
              </Field>
              <FieldGroup>
                <Field>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={onGoogleSignIn}
                    disabled={isLoading}
                  >
                    Sign up with Google
                  </Button>
                  <FieldDescription className="px-6 text-center">
                    Already have an account? <Link href="/login">Sign in</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
