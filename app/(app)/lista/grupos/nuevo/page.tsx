import type { Metadata } from "next";
import { ProductGroupEditor } from "@/features/product-groups/ProductGroupEditor";
import { PRODUCT_GROUP_EDITOR_TEXT } from "@/features/product-groups/constants/product-group-editor.constants";

export const metadata: Metadata = {
  title: PRODUCT_GROUP_EDITOR_TEXT.TITLE,
};

const NuevoGrupoPage = (): React.JSX.Element => <ProductGroupEditor />;

export default NuevoGrupoPage;
