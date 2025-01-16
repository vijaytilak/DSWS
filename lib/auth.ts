import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "./firebase"

interface Credentials {
  email: string;
  password: string;
}

export async function authorize(credentials: Credentials) {
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
  } catch {
    return null
  }
}
