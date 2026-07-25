import { QaRoundDetailContent } from "./qa-round-detail-content";

export default async function QaRoundDetailPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId } = await params;
  return <QaRoundDetailContent roundId={roundId} />;
}
