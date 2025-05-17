import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import ChatLayoutClient from './layout-client';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authConfig);

  if (!session?.user) {
    redirect('/(auth)/login');
  }

  return (
    <ChatLayoutClient>{children}</ChatLayoutClient>
  );
}