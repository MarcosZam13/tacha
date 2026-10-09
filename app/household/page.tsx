import type { Metadata } from "next";
import { Household } from "@/features/household/Household";
import { HOUSEHOLD_TEXT } from "@/features/household/constants/household.constants";

export const metadata: Metadata = {
  title: HOUSEHOLD_TEXT.TITLE,
};

const HouseholdPage = (): React.JSX.Element => <Household />;

export default HouseholdPage;
