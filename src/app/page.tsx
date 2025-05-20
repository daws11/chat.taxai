import getServerSession from 'next-auth';
import { authConfig } from "@/lib/auth/auth-options";
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authConfig);
  
  if (session) {
    redirect('/chat');
  } else {
    redirect('/login');
  }
}

// Development branch