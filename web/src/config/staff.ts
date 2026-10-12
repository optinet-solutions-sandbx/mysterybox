import type { AppRole } from "@/backend/contract";

/**
 * The team's back-office accounts, added to every browser on first load (store/auth.ts ensureStaff).
 * Only salted SHA-256 hashes live here (the repo is public); the passwords were handed out
 * privately on 2026-10-12. To rotate one, generate a new salt + hash with the same scheme as
 * hashPassword(): sha256(`${salt}:${password}`). With Supabase these become real auth users and
 * this file goes away.
 */
export interface StaffSeed {
  email: string;
  firstName: string;
  lastName: string;
  role: Exclude<AppRole, "player">;
  salt: string;
  passwordHash: string;
}

export const TEAM_STAFF: StaffSeed[] = [
  { email: "alex@grailnoir.com", firstName: "Alex", lastName: "", role: "super_admin", salt: "65b4f2dc6ed57e82d1bad575f0a5bd40", passwordHash: "6d71ff0befcd79ca1b423d2a47c4cbc1d3c2a74ca0544e67ef69bf48c6f22fec" },
  { email: "meny@grailnoir.com", firstName: "Meny", lastName: "", role: "super_admin", salt: "b4860da7b8009c2f5167db4d30a95d8a", passwordHash: "1b665ba6fbb024f22787d837b2dd1b0dab3ccb98d9bf961e1ce782b0c4292926" },
  { email: "ivan@grailnoir.com", firstName: "Ivan", lastName: "", role: "super_admin", salt: "a4d7db726528e04937de14875e800972", passwordHash: "3850f89fb904c42f641f7f000a9f968c53fb54864823f75353b9d2dee1a3fb34" },
  { email: "chris@grailnoir.com", firstName: "Chris", lastName: "", role: "super_admin", salt: "e52d422b2f22c01ccbfd969f6b14e1ff", passwordHash: "acde476febe4b7547d09ca62007fe11a9624757b76a1bdbc0a3092d14f65689f" },
  { email: "john@grailnoir.com", firstName: "John", lastName: "", role: "super_admin", salt: "699deb95048c9e07966ff1b424b09d54", passwordHash: "d0e05b40c35ffac9237eea2bb6fed3405b138ff83ab49b6b997512a93c850bb5" },
];
