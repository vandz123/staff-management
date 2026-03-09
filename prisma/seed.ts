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
    update: {},
    create: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@company.com",
      hireDate: new Date(),
      departmentId: hr.id,
      positionId: managerPos.id,
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
    update: {},
    create: {
      firstName: "Manager",
      lastName: "User",
      email: "manager@company.com",
      hireDate: new Date(),
      departmentId: ops.id,
      positionId: managerPos.id,
    },
  });
  await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      passwordHash,
      role: UserRole.manager,
      employeeId: managerEmp.id,
    },
  });

  const staffEmp = await prisma.employee.upsert({
    where: { email: "staff@company.com" },
    update: {},
    create: {
      firstName: "Staff",
      lastName: "User",
      email: "staff@company.com",
      hireDate: new Date(),
      departmentId: ops.id,
      positionId: staffPos.id,
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

  console.log("Seed done. Login: admin | manager | staff | password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
