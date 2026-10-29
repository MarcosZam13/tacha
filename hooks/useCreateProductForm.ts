import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CatalogBaseUnitType } from "@/constants/catalog.constants";
import {
  CREATE_PRODUCT_FORM_ERROR,
  CREATE_PRODUCT_FORM_STATUS,
  CREATE_PRODUCT_FORM_TEXT,
  CREATE_PRODUCT_FORM_UNIT_OPTIONS,
} from "@/constants/create-product-form.constants";
import type { CreateProductFormStatusType } from "@/constants/create-product-form.constants";
import { getCategories } from "@/services/catalog.service";
import { createPersonalProduct, hasHousehold } from "@/services/personal-product.service";
import type { Category } from "@/types/catalog.types";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";

interface UseCreateProductFormReturn {
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
  onQuantityChange: (quantity: string) => void;
  onShareWithHouseholdChange: (shareWithHousehold: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  quantity: string;
  quantityError: NullableUndefined<string>;
  shareWithHousehold: boolean;
  showShareCheckbox: boolean;
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
    setIsCategoriesLoading(true);
    setCategoriesErrorMessage(null);

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
    setErrorMessage(null);
  };

  const onOpen = (): void => {
    resetFields();
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

  const submit = async (): Promise<void> => {
    // Doble clic: mientras guarda no se manda otra vez.
    if (status === CREATE_PRODUCT_FORM_STATUS.SUBMITTING) return;

    const nextNameError = validateName(name);
    const nextCategoryError = validateCategory(categoryId);
    const nextQuantityError = validateQuantity(quantity);
    setNameError(nextNameError);
    setCategoryError(nextCategoryError);
    setQuantityError(nextQuantityError);
    // CA-02: nombre y categoría vacíos no llaman al RPC. La cantidad corre la
    // misma regla: sin ella no hay variante que crear (SPEC.md §5).
    if (nextNameError || nextCategoryError || nextQuantityError) return;

    setErrorMessage(null);
    setStatus(CREATE_PRODUCT_FORM_STATUS.SUBMITTING);

    try {
      const productId = await createPersonalProduct({
        baseQuantity: Number(quantity),
        baseUnit,
        brandName: brandName.trim() || undefined,
        categoryId,
        name: name.trim(),
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
    brandName,
    canSubmit: name.trim().length > 0 && categoryId.length > 0 && validateQuantity(quantity) === undefined,
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
    onQuantityChange,
    onShareWithHouseholdChange,
    onSubmit,
    quantity,
    quantityError,
    shareWithHousehold,
    showShareCheckbox,
  };
};
