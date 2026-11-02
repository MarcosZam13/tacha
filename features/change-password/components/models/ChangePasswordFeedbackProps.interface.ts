import type { ChangePasswordViewModel } from "../../models/ChangePasswordViewModel.interface";

export type ChangePasswordFeedbackProps = Pick<ChangePasswordViewModel, "status" | "submitError">;
