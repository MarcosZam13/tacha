import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_RULE,
  PASSWORD_RULES,
  PASSWORD_STRENGTH_LEVEL,
  PASSWORD_STRENGTH_THRESHOLD,
} from "@/constants";
import type { PasswordRuleType, PasswordStrengthLevelType } from "@/constants";
import type { PasswordStrength } from "@/types/password.types";

// Una función por regla: agregar una regla nueva es agregar una entrada aquí y en las constantes.
const RULE_CHECK: Record<PasswordRuleType, (password: string) => boolean> = {
  [PASSWORD_RULE.DIGIT]: (password) => PASSWORD_PATTERN.DIGIT.test(password),
  [PASSWORD_RULE.LOWERCASE]: (password) => PASSWORD_PATTERN.LOWERCASE.test(password),
  [PASSWORD_RULE.MIN_LENGTH]: (password) => password.length >= PASSWORD_MIN_LENGTH,
  [PASSWORD_RULE.SPECIAL]: (password) => PASSWORD_PATTERN.SPECIAL.test(password),
  [PASSWORD_RULE.UPPERCASE]: (password) => PASSWORD_PATTERN.UPPERCASE.test(password),
};

const getStrengthLevel = (metCount: number): PasswordStrengthLevelType =>
  metCount >= PASSWORD_STRENGTH_THRESHOLD.STRONG_MIN
    ? PASSWORD_STRENGTH_LEVEL.STRONG
    : metCount >= PASSWORD_STRENGTH_THRESHOLD.MEDIUM_MIN
      ? PASSWORD_STRENGTH_LEVEL.MEDIUM
      : PASSWORD_STRENGTH_LEVEL.WEAK;

export const evaluatePasswordStrength = (password: string): PasswordStrength => {
  const missingRules = PASSWORD_RULES.filter((rule) => !RULE_CHECK[rule](password));
  const metCount = PASSWORD_RULES.length - missingRules.length;

  return {
    level: getStrengthLevel(metCount),
    metCount,
    missingRules,
    totalRules: PASSWORD_RULES.length,
  };
};