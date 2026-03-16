import { ChatShell } from "@/components/chat/ChatShell"

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  return <ChatShell threadId={threadId} />
}
