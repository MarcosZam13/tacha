"use client";

import Link from "next/link";
import { Button, Spinner } from "@/components/ui";
import { APP_ROUTE, BUTTON_VARIANT } from "@/constants";
import { ListSettingsRow } from "./components/ListSettingsRow";
import { LIST_SETTINGS_STATUS, LIST_SETTINGS_TEXT } from "./constants/list-settings.constants";
import { useListSettingsViewModel } from "./hooks/useListSettingsViewModel";

/**
 * Pantalla de Configuración (SCRUM-108 / HU-78): ajustes por lista, hoy solo el interruptor "Encargado". Va dentro
 * del shell de las rutas privadas, que ya trae el <main>. "use client" porque usa hooks y habla con Supabase desde
 * el navegador.
 */
export const ListSettings = (): React.JSX.Element => {
  const { errorByListId, lists, onRetry, onToggle, savingListIds, status } = useListSettingsViewModel();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <Link href={APP_ROUTE.PROFILE} className="font-body text-sm text-tacha-teal hover:underline">
        {LIST_SETTINGS_TEXT.BACK_TO_PROFILE}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{LIST_SETTINGS_TEXT.TITLE}</h1>
        <p className="font-body text-sm text-tacha-textsec">{LIST_SETTINGS_TEXT.SUBTITLE}</p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="assignee-setting-title">
        <div className="flex flex-col gap-1">
          <h2 id="assignee-setting-title" className="font-display text-xl font-semibold text-tacha-text">
            {LIST_SETTINGS_TEXT.ASSIGNEE_TITLE}
          </h2>
          <p className="font-body text-sm text-tacha-textsec">{LIST_SETTINGS_TEXT.ASSIGNEE_DESCRIPTION}</p>
        </div>

        {status === LIST_SETTINGS_STATUS.LOADING ? <Spinner /> : null}
        {status === LIST_SETTINGS_STATUS.ERROR ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="font-body text-sm text-tacha-danger">
              {LIST_SETTINGS_TEXT.LOAD_ERROR}
            </p>
            <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
              {LIST_SETTINGS_TEXT.RETRY}
            </Button>
          </div>
        ) : null}
        {status === LIST_SETTINGS_STATUS.EMPTY ? (
          <p className="font-body text-sm text-tacha-textsec">{LIST_SETTINGS_TEXT.EMPTY}</p>
        ) : null}
        {status === LIST_SETTINGS_STATUS.READY ? (
          <ul className="divide-y divide-tacha-border rounded-tacha-card border border-tacha-border bg-tacha-surface">
            {lists.map((list) => (
              <ListSettingsRow
                key={list.id}
                errorMessage={errorByListId[list.id]}
                isSaving={savingListIds.includes(list.id)}
                list={list}
                onToggle={() => onToggle(list.id)}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
};
