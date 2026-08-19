import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutWrapper>{children}</ClientLayoutWrapper>;
}
