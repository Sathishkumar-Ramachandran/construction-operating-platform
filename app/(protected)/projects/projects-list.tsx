"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectStatusBadge } from "@/app/(protected)/projects/project-status-badge";
import type { ProjectStatus } from "@/lib/projects/constants";

export type ProjectCardView = {
  id: string;
  code: string;
  name: string;
  clientName: string | null;
  status: ProjectStatus;
  siteCount: number;
  startDate: string | null;
  endDate: string | null;
};

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "—";
  const start = new Date(startDate).toLocaleDateString();
  if (!endDate) return `${start} – ongoing`;
  return `${start} – ${new Date(endDate).toLocaleDateString()}`;
}

export function ProjectsList({ projects }: { projects: ProjectCardView[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No projects yet"
        description="Create a project to start planning sites, teams, and resources."
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sites</TableHead>
              <TableHead>Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{project.code}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{project.clientName ?? "—"}</TableCell>
                <TableCell>
                  <ProjectStatusBadge status={project.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.siteCount} {project.siteCount === 1 ? "site" : "sites"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateRange(project.startDate, project.endDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.code}</p>
              </div>
              <ProjectStatusBadge status={project.status} />
            </div>
            {project.clientName ? (
              <p className="truncate text-sm text-muted-foreground">{project.clientName}</p>
            ) : null}
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>
                {project.siteCount} {project.siteCount === 1 ? "site" : "sites"}
              </span>
              <span>{formatDateRange(project.startDate, project.endDate)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
