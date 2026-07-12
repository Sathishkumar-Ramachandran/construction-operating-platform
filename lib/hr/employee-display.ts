/** Pure, dependency-free helpers safe to import from Client Components. */
export function employeeDisplayName(employee: {
  firstName: string;
  lastName?: string | null;
  preferredName?: string | null;
}) {
  if (employee.preferredName) return employee.preferredName;
  return [employee.firstName, employee.lastName].filter(Boolean).join(" ");
}
