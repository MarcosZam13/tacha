import type { NullableUndefined } from "@/types/nullable.types";

export interface VerificacionPendienteViewModel {
    feedbackMessage: NullableUndefined<string>;
    handleResend: () => Promise<void>;
    isResendDisabled: boolean;
    resendLabel: string;
}