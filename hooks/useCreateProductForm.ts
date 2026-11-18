import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CatalogBaseUnitType } from "@/constants/catalog.constants";
import {
  CREATE_PRODUCT_FORM_ERROR,
  CREATE_PRODUCT_FORM_STATUS,
  CREATE_PRODUCT_FORM_TEXT,
  CREATE_PRODUCT_FORM_UNIT_OPTIONS,
  CENTS_PER_COLON,
  REFERENCE_PRICE_LIMIT_CENTS,
  REFERENCE_PRICE_PATTERN,
  REFERENCE_STORE_CHOICE,
  REFERENCE_STORE_NAME_MAX_LENGTH,
} from "@/constants/create-product-form.constants";
import type {
  CreateProductFormStatusType,
  ReferenceStoreChoiceType,
} from "@/constants/create-product-form.constants";
import type { StoreSlug } from "@/constants/stores.constants";
import { getCategories } from "@/services/catalog.service";
import { createPersonalProduct, hasHousehold } from "@/services/personal-product.service";
import type { Category } from "@/types/catalog.types";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";

export interface UseCreateProductFormReturn {
  baseUnit: CatalogBaseUnitType;
  brandName: string;
  canSubmit: boolean;
  categories: Category[];
  categoriesErrorMessage: NullableRef<string>;
  categoryError: NullableUndefined<string>;
  categoryId: string;
  errorMessage: NullableRef<string>;
  isCategoriesLoading: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  onBaseUnitChange: (baseUnit: CatalogBaseUnitType) => void;
  onBrandNameChange: (brandName: string) => void;
  onCancel: () => void;
  onCategoryChange: (categoryId: string) => void;
  onNameChange: (name: string) => void;
  onOpen: () => void;
  onPriceChange: (price: string) => void;
  /** HU-57: al salir del campo se muestra su error; "Guardar" deshabilitado no lo mostraría nunca. */
  onPriceBlur: () => void;
  onQuantityChange: (quantity: string) => void;
  onShareWithHouseholdChange: (shareWithHousehold: boolean) => void;
  onStoreChoiceChange: (storeChoice: ReferenceStoreChoiceType) => void;
  onStoreNameChange: (storeName: string) => void;
  onStoreNameBlur: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** HU-57: precio de referencia tal como se escribió (vacío = sin precio). */
  price: string;
  priceError: NullableUndefined<string>;
  quantity: string;
  quantityError: NullableUndefined<string>;
  shareWithHousehold: boolean;
  showShareCheckbox: boolean;
  /** HU-57: el campo de tienda escrita solo existe con "Otra tienda". */
  showStoreNameInput: boolean;
  storeChoice: ReferenceStoreChoiceType;
  storeName: string;
  storeNameError: NullableUndefined<string>;
}

const validateName = (name: string): NullableUndefined<string> =>
  name.trim().length === 0 ? CREATE_PRODUCT_FORM_ERROR.NAME_REQUIRED : undefined;

const validateCategory = (categoryId: string): NullableUndefined<string> =>
  categoryId.length === 0 ? CREATE_PRODUCT_FORM_ERROR.CATEGORY_REQUIRED : undefined;

// base_quantity es not null y lo valida de nuevo el servidor (22023); acá
// solo se evita el viaje de red con un número que ya se sabe inválido.
const validateQuantity = (quantity: string): NullableUndefined<string> => {
  const parsedQuantity = Number(quantity);
  return quantity.trim().length === 0 || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0
    ? CREATE_PRODUCT_FORM_ERROR.QUANTITY_REQUIRED
    : undefined;
};

// HU-57: "2850,50" y "2850.50" son el mismo precio; null si no es un precio.
const parsePrice = (price: string): NullableRef<number> => {
  const trimmedPrice = price.trim();
  return REFERENCE_PRICE_PATTERN.test(trimmedPrice) ? Number(trimmedPrice.replace(",", ".")) : null;
};

// HU-57: el precio es opcional; vacío no es un error, un número <= 0 sí.
// Se compara en céntimos, igual que lo guarda la columna numeric(12,2):
// 0.001 se guardaría 0.00 y 9999999999.996 se guardaría 10^10, y la base
// los rechazaría con el mensaje genérico en vez del error del campo.
const validatePrice = (price: string): NullableUndefined<string> => {
  if (price.trim().length === 0) return undefined;
  const parsedPrice = parsePrice(price);
  if (parsedPrice === null) return CREATE_PRODUCT_FORM_ERROR.PRICE_INVALID;
  const priceInCents = Math.round(parsedPrice * CENTS_PER_COLON);
  if (priceInCents <= 0) return CREATE_PRODUCT_FORM_ERROR.PRICE_INVALID;
  return priceInCents >= REFERENCE_PRICE_LIMIT_CENTS ? CREATE_PRODUCT_FORM_ERROR.PRICE_TOO_HIGH : undefined;
};

// HU-57: el nombre de la tienda solo se exige si se eligió "Otra tienda".
const validateStoreName = (
  storeChoice: ReferenceStoreChoiceType,
  storeName: string,
): NullableUndefined<string> => {
  if (storeChoice !== REFERENCE_STORE_CHOICE.CUSTOM) return undefined;
  const trimmedStoreName = storeName.trim();
  if (trimmedStoreName.length === 0) return CREATE_PRODUCT_FORM_ERROR.STORE_NAME_REQUIRED;
  return trimmedStoreName.length > REFERENCE_STORE_NAME_MAX_LENGTH
    ? CREATE_PRODUCT_FORM_ERROR.STORE_NAME_TOO_LONG
    : undefined;
};

const isSupermarketChoice = (storeChoice: ReferenceStoreChoiceType): storeChoice is StoreSlug =>
  storeChoice !== REFERENCE_STORE_CHOICE.NONE && storeChoice !== REFERENCE_STORE_CHOICE.CUSTOM;

const INITIAL_UNIT = CREATE_PRODUCT_FORM_UNIT_OPTIONS[0].value;

/**
 * Estado y validación del formulario "Agregar producto personalizado"
 * (SCRUM-87 / HU-56), compartido entre "Mis productos" y el enlace de CA-04
 * en features/catalog/ (los dos consumen este mismo hook, no una copia).
 *
 * `onSuccess` lo llama quien abrió el formulario para refrescar su propio
 * listado (SPEC.md §4: "visible de inmediato en el listado, sin recargar la
 * página") — este hook no sabe nada de qué pantalla lo usa.
 */
export const useCreateProductForm = (onSuccess: (productId: string) => void): UseCreateProductFormReturn => {
  const [status, setStatus] = useState<CreateProductFormStatusType>(CREATE_PRODUCT_FORM_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState<NullableRef<string>>(null);

  const [name, setName] = useState<string>("");
  const [nameError, setNameError] = useState<NullableUndefined<string>>(undefined);
  const [brandName, setBrandName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categoryError, setCategoryError] = useState<NullableUndefined<string>>(undefined);
  const [quantity, setQuantity] = useState<string>("");
  const [quantityError, setQuantityError] = useState<NullableUndefined<string>>(undefined);
  const [baseUnit, setBaseUnit] = useState<CatalogBaseUnitType>(INITIAL_UNIT);
  const [shareWithHousehold, setShareWithHousehold] = useState<boolean>(false);
  const [storeChoice, setStoreChoice] = useState<ReferenceStoreChoiceType>(REFERENCE_STORE_CHOICE.NONE);
  const [storeName, setStoreName] = useState<string>("");
  const [storeNameError, setStoreNameError] = useState<NullableUndefined<string>>(undefined);
  const [price, setPrice] = useState<string>("");
  const [priceError, setPriceError] = useState<NullableUndefined<string>>(undefined);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState<boolean>(false);
  const [categoriesErrorMessage, setCategoriesErrorMessage] = useState<NullableRef<string>>(null);
  const [showShareCheckbox, setShowShareCheckbox] = useState<boolean>(false);

  const isOpen = status !== CREATE_PRODUCT_FORM_STATUS.IDLE;

  // Se carga recién al abrir (no al montar: el formulario puede no abrirse
  // nunca en una visita). Si la pantalla se cierra antes de que responda la
  // base, la respuesta se ignora en vez de actualizar un estado que ya no existe.
  useEffect(() => {
    if (!isOpen) return undefined;

    let isCancelled = false;

    Promise.all([getCategories(), hasHousehold()])
      .then(([loadedCategories, loadedHasHousehold]) => {
        if (isCancelled) return;
        setCategories(loadedCategories);
        setShowShareCheckbox(loadedHasHousehold);
        setIsCategoriesLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setCategoriesErrorMessage(CREATE_PRODUCT_FORM_TEXT.CATEGORIES_ERROR);
        setIsCategoriesLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const resetFields = (): void => {
    setName("");
    setNameError(undefined);
    setBrandName("");
    setCategoryId("");
    setCategoryError(undefined);
    setQuantity("");
    setQuantityError(undefined);
    setBaseUnit(INITIAL_UNIT);
    setShareWithHousehold(false);
    setStoreChoice(REFERENCE_STORE_CHOICE.NONE);
    setStoreName("");
    setStoreNameError(undefined);
    setPrice("");
    setPriceError(undefined);
    setErrorMessage(null);
  };

  const onOpen = (): void => {
    resetFields();
    setIsCategoriesLoading(true);
    setCategoriesErrorMessage(null);
    setStatus(CREATE_PRODUCT_FORM_STATUS.OPEN);
  };

  const onCancel = (): void => {
    resetFields();
    setStatus(CREATE_PRODUCT_FORM_STATUS.IDLE);
  };

  // Al escribir se borra el error de ese campo: ya no describe lo que hay ahora.
  const onNameChange = (nextName: string): void => {
    setName(nextName);
    setNameError(undefined);
  };

  const onBrandNameChange = (nextBrandName: string): void => {
    setBrandName(nextBrandName);
  };

  const onCategoryChange = (nextCategoryId: string): void => {
    setCategoryId(nextCategoryId);
    setCategoryError(undefined);
  };

  const onQuantityChange = (nextQuantity: string): void => {
    setQuantity(nextQuantity);
    setQuantityError(undefined);
  };

  const onBaseUnitChange = (nextBaseUnit: CatalogBaseUnitType): void => {
    setBaseUnit(nextBaseUnit);
  };

  const onShareWithHouseholdChange = (nextShareWithHousehold: boolean): void => {
    setShareWithHousehold(nextShareWithHousehold);
  };

  // Cambiar de tienda borra lo escrito en "Otra tienda": nunca viajan las dos (051).
  const onStoreChoiceChange = (nextStoreChoice: ReferenceStoreChoiceType): void => {
    setStoreChoice(nextStoreChoice);
    setStoreName("");
    setStoreNameError(undefined);
  };

  const onStoreNameChange = (nextStoreName: string): void => {
    setStoreName(nextStoreName);
    setStoreNameError(undefined);
  };

  const onPriceChange = (nextPrice: string): void => {
    setPrice(nextPrice);
    setPriceError(undefined);
  };

  const onPriceBlur = (): void => {
    setPriceError(validatePrice(price));
  };

  const onStoreNameBlur = (): void => {
    setStoreNameError(validateStoreName(storeChoice, storeName));
  };

  const submit = async (): Promise<void> => {
    // Doble clic: mientras guarda no se manda otra vez.
    if (status === CREATE_PRODUCT_FORM_STATUS.SUBMITTING) return;

    const nextNameError = validateName(name);
    const nextCategoryError = validateCategory(categoryId);
    const nextQuantityError = validateQuantity(quantity);
    const nextStoreNameError = validateStoreName(storeChoice, storeName);
    const nextPriceError = validatePrice(price);
    setNameError(nextNameError);
    setCategoryError(nextCategoryError);
    setQuantityError(nextQuantityError);
    setStoreNameError(nextStoreNameError);
    setPriceError(nextPriceError);
    // CA-02: nombre y categoría vacíos no llaman al RPC. La cantidad corre la
    // misma regla: sin ella no hay variante que crear (SPEC.md §5). HU-57:
    // un precio o una tienda escrita inválidos tampoco.
    if (nextNameError || nextCategoryError || nextQuantityError || nextStoreNameError || nextPriceError) {
      return;
    }

    setErrorMessage(null);
    setStatus(CREATE_PRODUCT_FORM_STATUS.SUBMITTING);

    try {
      const productId = await createPersonalProduct({
        baseQuantity: Number(quantity),
        baseUnit,
        brandName: brandName.trim() || undefined,
        categoryId,
        name: name.trim(),
        // Ya validado: si hay texto, es un precio ("2850,50" llega como 2850.5).
        referencePrice: parsePrice(price) ?? undefined,
        referenceStoreName: storeChoice === REFERENCE_STORE_CHOICE.CUSTOM ? storeName.trim() : undefined,
        referenceStoreSlug: isSupermarketChoice(storeChoice) ? storeChoice : undefined,
        shareWithHousehold,
      });
      resetFields();
      setStatus(CREATE_PRODUCT_FORM_STATUS.IDLE);
      onSuccess(productId);
    } catch {
      // Nunca el error.message crudo del servidor (mismo criterio que
      // useHouseholdViewModel.submitHousehold): el formulario se mantiene
      // abierto con lo ya escrito (SPEC.md §7, no se pierde el trabajo del usuario).
      setErrorMessage(CREATE_PRODUCT_FORM_TEXT.SUBMIT_ERROR);
      setStatus(CREATE_PRODUCT_FORM_STATUS.OPEN);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submit();
  };

  return {
    baseUnit,
    brandName,
    canSubmit:
      name.trim().length > 0 &&
      categoryId.length > 0 &&
      validateQuantity(quantity) === undefined &&
      validateStoreName(storeChoice, storeName) === undefined &&
      validatePrice(price) === undefined,
    categories,
    categoriesErrorMessage,
    categoryError,
    categoryId,
    errorMessage,
    isCategoriesLoading,
    isOpen,
    isSubmitting: status === CREATE_PRODUCT_FORM_STATUS.SUBMITTING,
    name,
    nameError,
    onBaseUnitChange,
    onBrandNameChange,
    onCancel,
    onCategoryChange,
    onNameChange,
    onOpen,
    onPriceBlur,
    onPriceChange,
    onQuantityChange,
    onShareWithHouseholdChange,
    onStoreChoiceChange,
    onStoreNameBlur,
    onStoreNameChange,
    onSubmit,
    price,
    priceError,
    quantity,
    quantityError,
    shareWithHousehold,
    showShareCheckbox,
    showStoreNameInput: storeChoice === REFERENCE_STORE_CHOICE.CUSTOM,
    storeChoice,
    storeName,
    storeNameError,
  };
};
