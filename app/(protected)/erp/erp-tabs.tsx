"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialsSettings } from "@/app/(protected)/erp/materials/materials-settings";
import { SuppliersSettings } from "@/app/(protected)/erp/suppliers/suppliers-settings";
import { SimpleMasterDataSettings } from "@/components/hr/simple-master-data-settings";
import { saveMaterialCategoryAction, setMaterialCategoryActiveAction } from "@/actions/erp-actions";

/** One console for ERP configurable data — materials/equipment catalog,
 * categories, and suppliers — mirroring HrSettingsTabs's "one console
 * instead of many URLs" precedent. Stock/Purchase Orders arrive in later
 * phases and will get their own tabs here. */
export function ErpTabs() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const defaultTab = requestedTab ?? "materials";

  return (
    <Tabs defaultValue={defaultTab}>
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-max min-w-full">
          <TabsTrigger value="materials">Materials & Equipment</TabsTrigger>
          <TabsTrigger value="material-categories">Categories</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="materials" className="pt-4">
        <MaterialsSettings />
      </TabsContent>

      <TabsContent value="material-categories" className="pt-4">
        <SimpleMasterDataSettings
          apiType="material-categories"
          apiBasePath="/api/erp-settings"
          queryKeyPrefix="/api/erp-settings"
          entityLabel="material category"
          saveAction={saveMaterialCategoryAction}
          toggleAction={setMaterialCategoryActiveAction}
        />
      </TabsContent>

      <TabsContent value="suppliers" className="pt-4">
        <SuppliersSettings />
      </TabsContent>
    </Tabs>
  );
}
