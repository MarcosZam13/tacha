import type { Metadata } from "next";
import { DATE_LIST_TEXT } from "@/features/date-lists/constants/date-lists.constants";
import { DateLists } from "@/features/date-lists/DateLists";

export const metadata: Metadata = {
  title: DATE_LIST_TEXT.TITLE,
};

const FechasPage = (): React.JSX.Element => <DateLists />;

export default FechasPage;
