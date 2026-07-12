import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { EmploymentStatus, WorkforceAvailability, AssignmentStatus } from "@/lib/hr/constants";
import { createEmployee, updateEmployee, getEmployeeById, resolveEmployeeAccess } from "@/lib/services/employee-service";
import { changeEmploymentStatus } from "@/lib/services/employee-status-service";
import { offboardEmployee } from "@/lib/services/employee-offboarding-service";
import { createAssignment } from "@/lib/services/employee-allocation-service";
import { getWorkforceAvailability } from "@/lib/services/employee-availability-service";
import { assertNoDepartmentCycle } from "@/lib/services/org-hierarchy-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createTestProject,
  createdEmployeeIds,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";

const createdUserIds: string[] = [];

describe("employee-service / employee-status-service / employee-offboarding-service (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("creates an employee with an auto-generated, unique employee number", async () => {
    const actor = await createActor(UserRole.HR, "hr-create-employee");
    createdUserIds.push(actor.id);

    const input = await buildCreateEmployeeInput();
    const employee = await createEmployee(actor, input);
    createdEmployeeIds.push(employee.id);

    expect(employee.employeeNumber).toMatch(/^EXL-EMP-\d{5,}$/);
    expect(employee.employmentStatus).toBe(EmploymentStatus.DRAFT);
  });

  it("rejects a duplicate work email", async () => {
    const actor = await createActor(UserRole.HR, "hr-dup-email");
    createdUserIds.push(actor.id);

    const email = `vitest-dup-${Date.now()}@test.excell.internal`;
    const first = await createEmployee(actor, await buildCreateEmployeeInput({ workEmail: email }));
    createdEmployeeIds.push(first.id);

    await expect(
      createEmployee(actor, await buildCreateEmployeeInput({ workEmail: email }))
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS });
  });

  it("rejects a reporting-manager change that would create a circular hierarchy", async () => {
    const actor = await createActor(UserRole.HR, "hr-cycle");
    createdUserIds.push(actor.id);

    const a = await createEmployee(actor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(a.id);
    const b = await createEmployee(actor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(b.id);

    // b reports to a
    await updateEmployee(actor, {
      ...(await buildCreateEmployeeInput()),
      id: b.id,
      version: 1,
      reportingManagerId: a.id,
    });

    // Now try to make a report to b — should be rejected as a cycle.
    await expect(
      updateEmployee(actor, {
        ...(await buildCreateEmployeeInput()),
        id: a.id,
        version: 1,
        reportingManagerId: b.id,
      })
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_REPORTING_CYCLE });
  });

  it("rejects a department parent that would create a circular hierarchy", async () => {
    const parent = await db.department.create({
      data: { code: `VITEST-PARENT-${Date.now()}`, name: "Vitest Parent Dept" },
    });
    const child = await db.department.create({
      data: {
        code: `VITEST-CHILD-${Date.now()}`,
        name: "Vitest Child Dept",
        parentDepartmentId: parent.id,
      },
    });

    await expect(assertNoDepartmentCycle(parent.id, child.id)).rejects.toMatchObject({
      code: ErrorCode.DEPARTMENT_CIRCULAR_HIERARCHY,
    });

    await db.department.deleteMany({ where: { id: { in: [parent.id, child.id] } } });
  });

  it("transitions employment status only along allowed paths and records history", async () => {
    const actor = await createActor(UserRole.HR, "hr-status");
    createdUserIds.push(actor.id);

    const employee = await createEmployee(actor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);

    const activated = await changeEmploymentStatus(actor, {
      employeeId: employee.id,
      newStatus: EmploymentStatus.ACTIVE,
      effectiveDate: "2026-01-01",
      reason: "Onboarding complete",
    });
    expect(activated.employmentStatus).toBe(EmploymentStatus.ACTIVE);

    await expect(
      changeEmploymentStatus(actor, {
        employeeId: employee.id,
        newStatus: EmploymentStatus.OFFBOARDED,
        effectiveDate: "2026-01-02",
        reason: "Skip straight to offboarded",
      })
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_INVALID_STATUS_TRANSITION });

    const history = await db.employeeStatusHistory.findMany({ where: { employeeId: employee.id } });
    expect(history.length).toBe(1);
    expect(history[0].newStatus).toBe(EmploymentStatus.ACTIVE);
  });

  it("flips workforce availability from FREE to IN_PROJECT when a 100% assignment is created", async () => {
    const actor = await createActor(UserRole.HR, "hr-allocation");
    createdUserIds.push(actor.id);

    const employee = await createEmployee(actor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);
    await changeEmploymentStatus(actor, {
      employeeId: employee.id,
      newStatus: EmploymentStatus.ACTIVE,
      effectiveDate: "2026-01-01",
      reason: "Activate",
    });

    expect(await getWorkforceAvailability(employee.id)).toBe(WorkforceAvailability.FREE);

    const project = await createTestProject("Allocation Test Project");
    const assignment = await createAssignment(actor, {
      employeeId: employee.id,
      projectId: project.id,
      allocationPercentage: 100,
      startDate: "2020-01-01", // in the past so status resolves to ACTIVE, not PLANNED
      isPrimary: true,
    });
    expect(assignment.status).toBe(AssignmentStatus.ACTIVE);

    expect(await getWorkforceAvailability(employee.id)).toBe(WorkforceAvailability.IN_PROJECT);
  });

  it("rejects an assignment that would push total active allocation over 100%", async () => {
    const actor = await createActor(UserRole.HR, "hr-overalloc");
    createdUserIds.push(actor.id);

    const employee = await createEmployee(actor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);
    await changeEmploymentStatus(actor, {
      employeeId: employee.id,
      newStatus: EmploymentStatus.ACTIVE,
      effectiveDate: "2026-01-01",
      reason: "Activate",
    });

    const project = await createTestProject("Overallocation Test Project");
    await createAssignment(actor, {
      employeeId: employee.id,
      projectId: project.id,
      allocationPercentage: 70,
      startDate: "2020-01-01",
      isPrimary: true,
    });

    await expect(
      createAssignment(actor, {
        employeeId: employee.id,
        projectId: project.id,
        allocationPercentage: 50,
        startDate: "2020-01-01",
        isPrimary: false,
      })
    ).rejects.toMatchObject({ code: ErrorCode.ASSIGNMENT_OVER_ALLOCATED });
  });

  it("offboarding deactivates the linked user, revokes sessions, and closes active assignments", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-offboard-actor");
    createdUserIds.push(hrActor.id);

    const linkedUser = await createActor(UserRole.TEAM_MEMBER, "offboard-target-user");
    createdUserIds.push(linkedUser.id);
    await db.session.create({
      data: {
        userId: linkedUser.id,
        tokenHash: `vitest-session-${Date.now()}`,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const employee = await createEmployee(
      hrActor,
      await buildCreateEmployeeInput({ workEmail: `vitest-offboard-${Date.now()}@test.excell.internal` })
    );
    createdEmployeeIds.push(employee.id);
    await db.employee.update({ where: { id: employee.id }, data: { userId: linkedUser.id } });
    await changeEmploymentStatus(hrActor, {
      employeeId: employee.id,
      newStatus: EmploymentStatus.ACTIVE,
      effectiveDate: "2026-01-01",
      reason: "Activate",
    });

    const project = await createTestProject("Offboarding Test Project");
    await createAssignment(hrActor, {
      employeeId: employee.id,
      projectId: project.id,
      allocationPercentage: 100,
      startDate: "2020-01-01",
      isPrimary: true,
    });

    const result = await offboardEmployee(hrActor, {
      employeeId: employee.id,
      triggerCategory: "RESIGNATION",
      lastWorkingDate: "2026-02-01",
      reason: "Employee resigned",
      rehireEligible: true,
    });

    expect(result.assignmentsClosed).toBe(1);
    expect(result.userDeactivated).toBe(true);
    expect(result.sessionsRevoked).toBe(1);

    const updatedEmployee = await db.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updatedEmployee.employmentStatus).toBe(EmploymentStatus.OFFBOARDED);

    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: linkedUser.id } });
    expect(updatedUser.isActive).toBe(false);

    const remainingSessions = await db.session.count({ where: { userId: linkedUser.id } });
    expect(remainingSessions).toBe(0);

    expect(await getWorkforceAvailability(employee.id)).toBe(WorkforceAvailability.INACTIVE);
  });

  it("a MANAGER outside the reporting chain gets no access to an employee's record", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-scope-setup");
    createdUserIds.push(hrActor.id);
    const managerActor = await createActor(UserRole.MANAGER, "manager-outsider");
    createdUserIds.push(managerActor.id);

    const employee = await createEmployee(hrActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);

    const access = await resolveEmployeeAccess(managerActor, employee.id, null);
    expect(access).toBe("NONE");

    await expect(getEmployeeById(managerActor, employee.id)).rejects.toMatchObject({
      code: ErrorCode.EMPLOYEE_NOT_FOUND,
    });
  });

  it("the sensitive-access projection never includes raw ciphertext, only a masked last-4", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-sensitive-view");
    createdUserIds.push(hrActor.id);

    const employee = await createEmployee(
      hrActor,
      await buildCreateEmployeeInput({ nationalId: "S1234567A" })
    );
    createdEmployeeIds.push(employee.id);

    const { employee: fetched, access } = await getEmployeeById(hrActor, employee.id);
    // HR has HR.EMPLOYEE.VIEW_SENSITIVE by default in this phase's role
    // mapping, so this specific actor *does* get SENSITIVE access — but
    // even then, the projection must never include the ciphertext field.
    expect(access).toBe("SENSITIVE");
    expect(fetched).not.toHaveProperty("nationalIdCiphertext");
    expect((fetched as { nationalIdLast4?: string }).nationalIdLast4).toBe("567A");
  });
});
