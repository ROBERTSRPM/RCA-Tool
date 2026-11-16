import { WorkspaceLoader } from "@/components/workspace/WorkspaceLoader";

export default async function InvestigationPage({
  params,
}: PageProps<"/app/investigations/[id]">) {
  const { id } = await params;
  return <WorkspaceLoader id={id} />;
}
