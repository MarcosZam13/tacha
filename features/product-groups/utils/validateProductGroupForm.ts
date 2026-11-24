import type { NullableUndefined } from "@/types/nullable.types";
import {
  PRODUCT_GROUP_EDITOR_ERROR,
  PRODUCT_GROUP_EDITOR_TEXT,
  PRODUCT_GROUP_LIMIT,
} from "../constants/product-group-editor.constants";
import type {
  ProductGroupEditorErrors,
  ProductGroupEditorItem,
  ProductGroupEditorValues,
} from "../models/product-group-editor.interfaces";

const validateName = (name: string): NullableUndefined<string> => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return PRODUCT_GROUP_EDITOR_ERROR.NAME_REQUIRED;
  if (trimmedName.length > PRODUCT_GROUP_LIMIT.NAME_MAX_LENGTH) return PRODUCT_GROUP_EDITOR_ERROR.NAME_TOO_LONG;
  return undefined;
};

// El tope de 50 no se valida acá: el reducer no deja pasar de ahí.
const validateItems = (items: ProductGroupEditorItem[]): NullableUndefined<string> =>
  items.length === 0 ? PRODUCT_GROUP_EDITOR_ERROR.ITEMS_REQUIRED : undefined;

// Regla 7: un grupo compartido no puede tener productos personales sin
// compartir. El error nombra cada uno una vez, como la base.
const validateShare = (values: ProductGroupEditorValues): NullableUndefined<string> => {
  if (!values.shareWithHousehold) return undefined;

  const personalNames = [...new Set(values.items.filter((item) => item.isPersonal).map((item) => item.productName))];
  if (personalNames.length === 0) return undefined;

  return `${PRODUCT_GROUP_EDITOR_ERROR.SHARE_WITH_PERSONAL_PREFIX}${personalNames.join(PRODUCT_GROUP_EDITOR_TEXT.ITEM_NAMES_SEPARATOR)}`;
};

/**
 * Valida el grupo antes de guardarlo. Las mismas reglas están en los checks de
 * la 054 y en create_product_group (056): acá es para avisar antes de mandar,
 * allá es la garantía.
 */
export const validateProductGroupForm = (values: ProductGroupEditorValues): ProductGroupEditorErrors => ({
  items: validateItems(values.items),
  name: validateName(values.name),
  share: validateShare(values),
});

export const hasProductGroupFormErrors = (errors: ProductGroupEditorErrors): boolean =>
  Boolean(errors.items) || Boolean(errors.name) || Boolean(errors.share);
