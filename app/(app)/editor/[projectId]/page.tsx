import { EditorWorkspace } from "@/components/editor/editor-workspace";

export const instant = false;

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  // Same client tree per project; key → switching projects remounts cleanly.
  return <EditorWorkspace key={projectId} projectId={projectId} />;
}
