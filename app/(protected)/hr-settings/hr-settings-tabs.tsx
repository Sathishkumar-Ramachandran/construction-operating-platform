"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentsSettings } from "@/app/(protected)/hr-settings/departments/departments-settings";
import { DesignationsSettings } from "@/app/(protected)/hr-settings/designations/designations-settings";
import { GradesSettings } from "@/app/(protected)/hr-settings/grades/grades-settings";
import { DocumentTypesSettings } from "@/app/(protected)/hr-settings/document-types/document-types-settings";
import { CertificationTypesSettings } from "@/app/(protected)/hr-settings/certification-types/certification-types-settings";
import { ProjectsSettings } from "@/app/(protected)/hr-settings/projects/projects-settings";
import { ShiftTypesSettings } from "@/app/(protected)/hr-settings/shift-types/shift-types-settings";
import { HolidaysSettings } from "@/app/(protected)/hr-settings/holidays/holidays-settings";
import { SimpleMasterDataSettings } from "@/components/hr/simple-master-data-settings";
import {
  saveEmploymentTypeAction,
  setEmploymentTypeActiveAction,
  saveProjectRoleAction,
  setProjectRoleActiveAction,
} from "@/actions/hr-master-data-actions";

const MASTER_DATA_TABS = [
  { value: "departments", label: "Departments" },
  { value: "designations", label: "Designations" },
  { value: "grades", label: "Employment Grades" },
  { value: "employment-types", label: "Employment Types" },
  { value: "project-roles", label: "Project Roles" },
  { value: "document-types", label: "Document Types" },
  { value: "certification-types", label: "Certification Types" },
  { value: "shift-types", label: "Shift Types" },
  { value: "holidays", label: "Holidays" },
] as const;

/**
 * One console for every piece of HR configurable data instead of eight
 * separate URLs — this is where HR sets up the company once (departments,
 * job titles, which documents each job title requires, etc.) rather than
 * hunting through the sidebar for each piece.
 */
export function HrSettingsTabs({
  canManageMasterData,
  canManageAllocation,
}: {
  canManageMasterData: boolean;
  canManageAllocation: boolean;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const defaultTab = canManageAllocation && !canManageMasterData ? "projects" : requestedTab ?? "departments";

  return (
    <Tabs defaultValue={defaultTab}>
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-max min-w-full">
          {canManageAllocation ? <TabsTrigger value="projects">Projects & Sites</TabsTrigger> : null}
          {canManageMasterData
            ? MASTER_DATA_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))
            : null}
        </TabsList>
      </div>

      {canManageAllocation ? (
        <TabsContent value="projects" className="pt-4">
          <ProjectsSettings />
        </TabsContent>
      ) : null}

      {canManageMasterData ? (
        <>
          <TabsContent value="departments" className="pt-4">
            <DepartmentsSettings />
          </TabsContent>
          <TabsContent value="designations" className="pt-4">
            <DesignationsSettings />
          </TabsContent>
          <TabsContent value="grades" className="pt-4">
            <GradesSettings />
          </TabsContent>
          <TabsContent value="employment-types" className="pt-4">
            <SimpleMasterDataSettings
              apiType="employment-types"
              entityLabel="employment type"
              saveAction={saveEmploymentTypeAction}
              toggleAction={setEmploymentTypeActiveAction}
            />
          </TabsContent>
          <TabsContent value="project-roles" className="pt-4">
            <SimpleMasterDataSettings
              apiType="project-roles"
              entityLabel="project role"
              saveAction={saveProjectRoleAction}
              toggleAction={setProjectRoleActiveAction}
            />
          </TabsContent>
          <TabsContent value="document-types" className="pt-4">
            <DocumentTypesSettings />
          </TabsContent>
          <TabsContent value="certification-types" className="pt-4">
            <CertificationTypesSettings />
          </TabsContent>
          <TabsContent value="shift-types" className="pt-4">
            <ShiftTypesSettings />
          </TabsContent>
          <TabsContent value="holidays" className="pt-4">
            <HolidaysSettings />
          </TabsContent>
        </>
      ) : null}
    </Tabs>
  );
}
