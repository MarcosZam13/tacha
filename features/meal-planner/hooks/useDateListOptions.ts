import { useRef, useState } from "react";
import { DATE_LIST_OPTIONS_STATUS } from "../constants/meal-planner.constants";
import type { DateListOptionsLoader, UseDateListOptionsParams } from "../models/week-list-addition.interfaces";
import type { DateListOptionsState } from "../models/week-list-addition.types";
import { getDateListOptions } from "../services/date-list-options.service";

const IDLE_STATE: DateListOptionsState = { status: DATE_LIST_OPTIONS_STATUS.IDLE };

/**
 * Las sublistas del selector. Se piden cada vez que se abre el diálogo, para que
 * una recién creada aparezca (SPEC regla 41). Sin efecto: las pide quien abre o
 * reintenta, y el número de pedido descarta las respuestas viejas.
 */
export const useDateListOptions = ({ todayKey }: UseDateListOptionsParams): DateListOptionsLoader => {
  const [state, setState] = useState<DateListOptionsState>(IDLE_STATE);
  const lastRequestRef = useRef(0);

  const load = (): void => {
    if (todayKey === null) return;

    lastRequestRef.current += 1;
    const request = lastRequestRef.current;
    setState({ status: DATE_LIST_OPTIONS_STATUS.LOADING });

    void getDateListOptions(todayKey)
      .then((options) => {
        if (request === lastRequestRef.current) setState({ options, status: DATE_LIST_OPTIONS_STATUS.READY });
      })
      .catch(() => {
        if (request === lastRequestRef.current) setState({ status: DATE_LIST_OPTIONS_STATUS.FAILED });
      });
  };

  const clear = (): void => {
    lastRequestRef.current += 1;
    setState(IDLE_STATE);
  };

  return { clear, load, state };
};
