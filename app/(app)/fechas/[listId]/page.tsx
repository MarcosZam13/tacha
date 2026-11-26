import type { Metadata } from "next";
import { DATE_LIST_TEXT } from "@/features/date-lists/constants/date-lists.constants";
import { DateListDetailScreen } from "@/features/date-lists/DateListDetailScreen";

export const metadata: Metadata = {
  title: DATE_LIST_TEXT.TITLE,
};

interface SublistaPageProps {
  params: Promise<{ listId: string }>;
}

const SublistaPage = async ({ params }: SublistaPageProps): Promise<React.JSX.Element> => {
  const { listId } = await params;

  return <DateListDetailScreen listId={listId} />;
};

export default SublistaPage;
