import type { Metadata } from "next";
import { ListSettings } from "@/features/list-settings/ListSettings";
import { LIST_SETTINGS_TEXT } from "@/features/list-settings/constants/list-settings.constants";

export const metadata: Metadata = {
  title: LIST_SETTINGS_TEXT.TITLE,
};

const ListSettingsPage = (): React.JSX.Element => <ListSettings />;

export default ListSettingsPage;
