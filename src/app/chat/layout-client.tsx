"use client";
import NavbarWithSidebarClient from './navbar-client';

export default function ChatLayoutClient({ children }: { children: React.ReactNode }) {
  return <NavbarWithSidebarClient>{children}</NavbarWithSidebarClient>;
}
