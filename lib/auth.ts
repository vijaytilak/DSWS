import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          )
          
          if (userCredential.user) {
            return {
              id: userCredential.user.uid,
              email: userCredential.user.email,
            }
          }
          return null
        } catch (error) {
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  }
}
