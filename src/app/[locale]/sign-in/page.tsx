import { AuthPage, authMetadata, type AuthPageProps } from "@/components/auth/auth-page";

export const dynamic = "force-dynamic";
export const generateMetadata = (props: AuthPageProps) => authMetadata(props, "signIn");
export default function Page(props: AuthPageProps) { return <AuthPage {...props} mode="signIn"/>; }
