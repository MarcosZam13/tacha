"use client";

import { ScrapingDemoInner } from "./ScrapingDemoInner";
import type { ScrapingDemoProps } from "./models/ScrapingDemoProps.interface";

export const ScrapingDemo = ({ children }: ScrapingDemoProps): JSX.Element => {
  return <ScrapingDemoInner>{children}</ScrapingDemoInner>;
};
