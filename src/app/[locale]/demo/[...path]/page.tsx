import {
  MvpPage,
  mvpMetadata,
  type MvpPageProps,
} from "@/components/mvp/mvp-page";
export const dynamic = "force-dynamic";
export const generateMetadata = mvpMetadata;
export default function Page(props: MvpPageProps) {
  return <MvpPage {...props} demo />;
}
