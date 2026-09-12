import { MvpProvider } from "@/components/mvp/mvp-provider";
import { MvpShell } from "@/components/mvp/mvp-shell";
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MvpProvider demo viewer={{ name: "", email: "" }}>
      <MvpShell>{children}</MvpShell>
    </MvpProvider>
  );
}
