import type { Role as AccessRole } from "@/lib/roles";

export type Role = {
  role: string;
  users: number;
  description: string;
  permissions: string;
  /** Login portal this job role signs in through — see src/lib/login-as.ts. */
  loginAs: AccessRole;
};

export type BranchInfo = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  address: string | null;
  adminName: string | null;
  adminEmail: string | null;
};

export type BranchInput = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  address: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
};
