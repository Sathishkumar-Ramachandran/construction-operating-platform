import { requireApiUser } from "@/lib/auth/guards";
import * as erpMasterData from "@/lib/services/erp-master-data-service";

const LISTERS = {
  "material-categories": erpMasterData.listMaterialCategories,
  materials: erpMasterData.listMaterials,
  suppliers: erpMasterData.listSuppliers,
} as const;

type ErpMasterDataType = keyof typeof LISTERS;

function isErpMasterDataType(value: string): value is ErpMasterDataType {
  return value in LISTERS;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  // Any authenticated user, not just INVENTORY.MANAGE holders — these lists
  // back dropdowns (e.g. a future material picker on resource requests) that
  // need to be readable by whoever is filing the request, not only Admin.
  const guard = await requireApiUser();
  if (guard.response) return guard.response;

  const { type } = await params;
  if (!isErpMasterDataType(type)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const items = await LISTERS[type]();
  return Response.json({ items });
}
