"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from "@/lib/validation/employees";
import { createEmployeeAction, updateEmployeeAction } from "@/actions/employee-actions";
import { useHrMasterDataOptions } from "@/components/hr/use-master-data-options";

type EmployeeFormProps =
  | { mode: "create"; initialData?: never; employeeId?: never; version?: never }
  | {
      mode: "edit";
      employeeId: string;
      version: number;
      initialData: Partial<CreateEmployeeInput>;
    };

export function EmployeeForm(props: EmployeeFormProps) {
  const router = useRouter();
  const { departments, designations, grades, employmentTypes, shiftTypes, isLoading } =
    useHrMasterDataOptions();

  const schema = props.mode === "edit" ? updateEmployeeSchema : createEmployeeSchema;
  const defaultValues: CreateEmployeeInput = {
    firstName: "",
    middleName: "",
    lastName: "",
    preferredName: "",
    dateOfBirth: "",
    gender: "",
    nationalityCode: "",
    maritalStatus: "",
    nationalId: "",
    passportNumber: "",
    personalEmail: "",
    workEmail: "",
    mobileNumber: "",
    alternateMobileNumber: "",
    joiningDate: "",
    departmentId: "",
    designationId: "",
    gradeId: "",
    employmentTypeId: "",
    reportingManagerId: "",
    defaultShiftTypeId: "",
    ...(props.mode === "edit" ? props.initialData : {}),
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEmployeeInput | UpdateEmployeeInput>({
    resolver: zodResolver(schema as never),
    defaultValues:
      props.mode === "edit"
        ? { ...defaultValues, id: props.employeeId, version: props.version }
        : defaultValues,
  });

  const values = watch();

  async function onSubmit(formValues: CreateEmployeeInput | UpdateEmployeeInput) {
    const result =
      props.mode === "edit"
        ? await updateEmployeeAction(formValues)
        : await createEmployeeAction(formValues);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(props.mode === "edit" ? "Employee updated." : "Employee created.");
    const employeeId =
      props.mode === "edit" ? props.employeeId : (result.data as { id: string }).id;
    router.push(`/employees/${employeeId}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Personal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="Preferred name" error={errors.preferredName?.message}>
            <Input {...register("preferredName")} />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth?.message}>
            <Input type="date" {...register("dateOfBirth")} />
          </Field>
          <Field label="Gender">
            <Input {...register("gender")} placeholder="e.g. Male, Female" />
          </Field>
          <Field label="Nationality code">
            <Input {...register("nationalityCode")} placeholder="e.g. SG" maxLength={2} />
          </Field>
          <Field label="National ID / NRIC">
            <Input {...register("nationalId")} />
          </Field>
          <Field label="Passport number">
            <Input {...register("passportNumber")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Contact</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Personal email" error={errors.personalEmail?.message}>
            <Input type="email" {...register("personalEmail")} />
          </Field>
          <Field label="Work email" error={errors.workEmail?.message}>
            <Input type="email" {...register("workEmail")} />
          </Field>
          <Field label="Mobile number">
            <Input {...register("mobileNumber")} />
          </Field>
          <Field label="Alternate mobile number">
            <Input {...register("alternateMobileNumber")} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">Employment</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Joining date" error={errors.joiningDate?.message} required>
            <Input type="date" {...register("joiningDate")} />
          </Field>
          <Field label="Department" error={errors.departmentId?.message} required>
            <Select
              value={values.departmentId}
              onValueChange={(v) => v && setValue("departmentId", v, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Designation" error={errors.designationId?.message} required>
            <Select
              value={values.designationId}
              onValueChange={(v) => v && setValue("designationId", v, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {designations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Employment grade">
            <Select
              value={values.gradeId || undefined}
              onValueChange={(v) => setValue("gradeId", v ?? "")}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select grade (optional)" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Employment type" error={errors.employmentTypeId?.message} required>
            <Select
              value={values.employmentTypeId}
              onValueChange={(v) => v && setValue("employmentTypeId", v, { shouldValidate: true })}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {employmentTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default shift">
            <Select
              value={values.defaultShiftTypeId || undefined}
              onValueChange={(v) => setValue("defaultShiftTypeId", v ?? "")}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select shift (optional)" />
              </SelectTrigger>
              <SelectContent>
                {shiftTypes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : props.mode === "edit" ? "Save changes" : "Create employee"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
