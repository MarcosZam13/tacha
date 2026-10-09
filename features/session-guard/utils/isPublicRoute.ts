import { PUBLIC_ROUTES } from "../constants/session-guard.constants";

export const isPublicRoute = (pathname: string): boolean => PUBLIC_ROUTES.includes(pathname);