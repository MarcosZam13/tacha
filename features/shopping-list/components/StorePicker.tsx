import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import type { StorePickerProps } from "./models/StorePickerProps.interface";

/**
 * El contenido del modal "¿Dónde estás comprando?": un botón por súper
 * (HU-36f CA-02). Va dentro del Modal de components/ui, que pone el título y
 * cierra con Escape. Mientras arranca la compra, los botones se deshabilitan
 * para no iniciar dos.
 */
export const StorePicker = ({ picker }: StorePickerProps): React.JSX.Element => (
  <div className="flex flex-col gap-3">
    {picker.isLoading ? <Spinner /> : null}
    {picker.errorMessage ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {picker.errorMessage}
      </p>
    ) : null}
    <ul className="flex flex-col gap-2">
      {picker.stores.map((store) => (
        <li key={store.id}>
          <Button
            variant={BUTTON_VARIANT.SECONDARY}
            isDisabled={picker.isStarting}
            onClick={() => picker.onPickStore(store.id)}
          >
            {store.name}
          </Button>
        </li>
      ))}
    </ul>
  </div>
);
