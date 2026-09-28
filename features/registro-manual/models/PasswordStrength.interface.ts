import type { PasswordRuleType, PasswordStrengthLevelType } from "../constants/registro.constants";

export interface PasswordStrength {
  level: PasswordStrengthLevelType;
  metCount: number;
  missingRules: PasswordRuleType[];
  totalRules: number;
}