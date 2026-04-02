import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword("password123");

  const hr = await prisma.department.upsert({
    where: { name: "Human Resources" },
    update: {},
    create: { name: "Human Resources", description: "HR department" },
  });
  const ops = await prisma.department.upsert({
    where: { name: "Operations" },
    update: {},
    create: { name: "Operations", description: "Operations department" },
  });

  const managerPos = await prisma.position.upsert({
    where: { name: "Manager" },
    update: {},
    create: { name: "Manager", description: "Department manager" },
  });
  const staffPos = await prisma.position.upsert({
    where: { name: "Staff" },
    update: {},
    create: { name: "Staff", description: "General staff" },
  });

  const adminEmp = await prisma.employee.upsert({
    where: { email: "admin@company.com" },
    update: {
      employeeCode: "NV001",
      baseSalary: 20000000,
      annualLeaveBalance: 12,
      phone: "0901234567",
      address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
      dateOfBirth: new Date("1985-03-15"),
      contractEndDate: new Date("2027-12-31"),
    },
    create: {
      employeeCode: "NV001",
      firstName: "Admin",
      lastName: "Nguyễn",
      email: "admin@company.com",
      phone: "0901234567",
      address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
      dateOfBirth: new Date("1985-03-15"),
      hireDate: new Date("2020-01-01"),
      contractEndDate: new Date("2027-12-31"),
      departmentId: hr.id,
      positionId: managerPos.id,
      baseSalary: 20000000,
      annualLeaveBalance: 12,
    },
  });
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      role: UserRole.admin,
      employeeId: adminEmp.id,
    },
  });

  const managerEmp = await prisma.employee.upsert({
    where: { email: "manager@company.com" },
    update: {
      employeeCode: "NV002",
      baseSalary: 18000000,
      annualLeaveBalance: 12,
      phone: "0912345678",
      address: "456 Lê Lợi, Quận 3, TP.HCM",
      dateOfBirth: new Date("1990-07-22"),
      contractEndDate: new Date("2026-06-30"),
    },
    create: {
      employeeCode: "NV002",
      firstName: "Minh",
      lastName: "Trần",
      email: "manager@company.com",
      phone: "0912345678",
      address: "456 Lê Lợi, Quận 3, TP.HCM",
      dateOfBirth: new Date("1990-07-22"),
      hireDate: new Date("2021-06-01"),
      contractEndDate: new Date("2026-06-30"),
      departmentId: ops.id,
      positionId: managerPos.id,
      baseSalary: 18000000,
      annualLeaveBalance: 12,
    },
  });
  await prisma.user.upsert({
    where: { username: "manager" },
    update: { role: UserRole.staff },
    create: {
      username: "manager",
      passwordHash,
      role: UserRole.staff,
      employeeId: managerEmp.id,
    },
  });

  const staffEmp = await prisma.employee.upsert({
    where: { email: "staff@company.com" },
    update: {
      employeeCode: "NV003",
      baseSalary: 15000000,
      annualLeaveBalance: 12,
      phone: "0923456789",
      address: "789 Trần Hưng Đạo, Quận 5, TP.HCM",
      dateOfBirth: new Date("1995-11-10"),
      contractEndDate: new Date("2026-04-15"),
    },
    create: {
      employeeCode: "NV003",
      firstName: "Hương",
      lastName: "Lê",
      email: "staff@company.com",
      phone: "0923456789",
      address: "789 Trần Hưng Đạo, Quận 5, TP.HCM",
      dateOfBirth: new Date("1995-11-10"),
      hireDate: new Date("2022-03-15"),
      contractEndDate: new Date("2026-04-15"),
      departmentId: ops.id,
      positionId: staffPos.id,
      baseSalary: 15000000,
      annualLeaveBalance: 12,
    },
  });
  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: {
      username: "staff",
      passwordHash,
      role: UserRole.staff,
      employeeId: staffEmp.id,
    },
  });

  await prisma.shift.upsert({
    where: { name: "Morning" },
    update: {},
    create: { name: "Morning", startTime: "09:00", endTime: "13:00", requiredStaff: 2 },
  });
  await prisma.shift.upsert({
    where: { name: "Afternoon" },
    update: {},
    create: { name: "Afternoon", startTime: "13:00", endTime: "17:00", requiredStaff: 2 },
  });

  // Create sample attendance data for last 7 days
  const shifts = await prisma.shift.findMany();
  const morningShift = shifts.find((s) => s.name === "Morning");
  const allEmployees = [adminEmp, managerEmp, staffEmp];

  if (morningShift) {
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);

      for (const emp of allEmployees) {
        // Create shift assignment
        await prisma.shiftAssignment.upsert({
          where: {
            employeeId_shiftId_workDate: {
              employeeId: emp.id,
              shiftId: morningShift.id,
              workDate: day,
            },
          },
          update: {},
          create: {
            employeeId: emp.id,
            shiftId: morningShift.id,
            workDate: day,
          },
        });

        // Create attendance with varied statuses
        const rand = Math.random();
        let checkIn: Date | null = null;
        let checkOut: Date | null = null;
        let status = "pending";

        if (rand < 0.6) {
          // On time
          checkIn = new Date(day);
          checkIn.setHours(8, 30 + Math.floor(Math.random() * 25), 0, 0);
          checkOut = new Date(day);
          checkOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);
          status = "present";
        } else if (rand < 0.85) {
          // Late
          checkIn = new Date(day);
          checkIn.setHours(9, 5 + Math.floor(Math.random() * 55), 0, 0);
          checkOut = new Date(day);
          checkOut.setHours(17, Math.floor(Math.random() * 30), 0, 0);
          status = "present";
        } else {
          // Absent
          status = "absent";
        }

        // Determine late/early flags
        let isLate = false;
        let isEarlyLeave = false;
        if (checkIn) {
          const mins = checkIn.getHours() * 60 + checkIn.getMinutes();
          isLate = mins > 8 * 60 + 10; // after 8:10
        }
        if (checkOut) {
          const mins = checkOut.getHours() * 60 + checkOut.getMinutes();
          isEarlyLeave = mins < 17 * 60 + 40; // before 17:40
        }

        await prisma.attendance.upsert({
          where: {
            employeeId_workDate: {
              employeeId: emp.id,
              workDate: day,
            },
          },
          update: { checkIn, checkOut, status, isLate, isEarlyLeave },
          create: {
            employeeId: emp.id,
            workDate: day,
            checkIn,
            checkOut,
            status,
            isLate,
            isEarlyLeave,
          },
        });
      }
    }
  }

  console.log("Seed done. Login: admin | staff — password: password123 (username 'manager' also exists as staff role)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
