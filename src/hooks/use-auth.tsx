import { useAuthActions} from '@convex-dev/auth/react'
import { useRouter} from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import {z} from 'zod'


const signInSchema =z.object ({
    email: z.string().email('Invalid email address'),
    password : z.string().min(6, 'Password must be at least 6 characters'),
})
const signUpSchema = z.object ({
    firstName : z.string().min(2, 'First Name'),
    lastname : z.string().min(2,'Last Name'),
    email: z.string().email('invalid email address'),
    password : z.string().min(6, 'Password must be atleast 6 characters '), 
})


type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>


export const useAuth = () => {
    const { signIn, signOut }= useAuthActions()
    const router = useRouter()
    const [isLoading, setIsLoading]= useState(false)

    const signInForm = useForm<SignInData>({
        resolver : zodResolver(signInSchema),
        defaultValues : {
            email:'',
            password:'',
        }
    })

    const signUpForm = useForm<SignUpData>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            firstName: '',
            lastname: '',
            email: '',
            password: '',
        }
    })

    const handleSignIn = async (data: SignInData) => {
        setIsLoading(true)
        try {
            await signIn('password', {
                email: data.email,
                password: data.password,
                flow: 'signIn',
            })
            router.push('/dashboard')
        } catch (error) {
            signInForm.setError('root', {
                message: 'Invalid email or password',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignUp = async (data: SignUpData) => {
        setIsLoading(true)
        try {
            await signIn('password', {
                email: data.email,
                password: data.password,
                firstName: data.firstName,
                lastname: data.lastname,
                flow: 'signUp',
            })
            router.push('/dashboard')
        } catch (error) {
            signUpForm.setError('root', {
                message: 'Could not create account',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignOut = async () => {
        setIsLoading(true)
        await signOut()
        setIsLoading(false)
    }

    const handleGoogleSignIn = () => {
        void signIn('google')
    }

    return {
        signInForm,
        signUpForm,
        handleSignIn,
        handleSignUp,
        handleSignOut,
        handleGoogleSignIn,
        isLoading,
    }
}