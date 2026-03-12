const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const policies = [
  {
    title: "Code of Conduct",
    category: "Workplace Rules",
    fileUrl: "/policies/code-of-conduct",
    content: `CODE OF CONDUCT POLICY

1. PROFESSIONAL BEHAVIOR
All employees are expected to conduct themselves in a professional manner at all times while representing the company. This includes interactions with colleagues, clients, and stakeholders.

2. RESPECT AND INCLUSION
- Treat all colleagues with respect and dignity regardless of position, gender, ethnicity, or background.
- Harassment of any kind (verbal, physical, or digital) is strictly prohibited and will result in disciplinary action.
- Discriminatory behavior or language will not be tolerated.

3. WORKPLACE ETHICS
- Employees must act with honesty and integrity in all business dealings.
- Conflicts of interest must be disclosed to management immediately.
- Company resources should be used only for authorized business purposes.
- Confidential information must not be shared outside the organization.

4. DRESS CODE
- Business casual attire is required during standard working hours.
- Appropriate safety gear must be worn in designated areas.

5. COMMUNICATION
- Use professional language in all work communications (email, chat, phone).
- Respond to internal communications within 24 hours during business days.
- Report any unethical behavior to HR or management immediately.

6. DISCIPLINARY ACTIONS
- First offense: Verbal warning
- Second offense: Written warning
- Third offense: Suspension (1-5 days depending on severity)
- Severe violations: Immediate termination

Effective Date: January 1, 2026
Last Updated: January 1, 2026`
  },
  {
    title: "Attendance Policy",
    category: "HR Policies",
    fileUrl: "/policies/attendance",
    content: `ATTENDANCE POLICY

1. WORKING HOURS
- Standard working hours are 8 hours per day, 5 days per week (Monday to Friday).
- Shift schedules are assigned by managers and must be followed.
- The standard shifts are:
  * Morning Shift: 08:00 – 16:00
  * Evening Shift: 16:00 – 00:00

2. CHECK-IN AND CHECK-OUT
- Employees must check in at the start of their shift and check out at the end.
- Check-in/out is done through the Staff Management System attendance page.
- Checking out before the scheduled shift end time will be flagged as early departure.
- Early departures require manager acknowledgment.

3. PUNCTUALITY
- Employees are expected to check in on time or before their shift starts.
- A grace period of 5 minutes is allowed.
- Check-in more than 5 minutes after shift start is marked as "Late."

4. LATE ARRIVAL POLICY
- 1-3 late arrivals per month: Verbal reminder
- 4-6 late arrivals per month: Written warning
- 7+ late arrivals per month: Salary deduction (proportional to hours missed)

5. ABSENCE REPORTING
- Unplanned absences must be reported to your manager at least 1 hour before shift start.
- Unauthorized absence for 3 consecutive days may result in termination.
- Absences must be supported by documentation (medical certificate for sick leave).

6. MINIMUM STAFFING
- Each shift requires a minimum of 5 staff members.
- Managers must ensure adequate coverage before approving leave or shift changes.

Effective Date: January 1, 2026
Last Updated: March 1, 2026`
  },
  {
    title: "Leave Policy",
    category: "HR Policies",
    fileUrl: "/policies/leave",
    content: `LEAVE POLICY

1. ANNUAL LEAVE
- Each employee is entitled to 12 days of paid annual leave per year.
- Leave balance resets on January 1st each year.
- Unused leave does not carry over to the next year.
- Annual leave must be requested at least 3 days in advance.

2. SICK LEAVE
- Employees are entitled to 30 days of sick leave per year (as per Vietnamese labor law).
- A medical certificate is required for sick leave exceeding 2 consecutive days.
- Sick leave must be reported to the manager as soon as possible.

3. UNPAID LEAVE
- Unpaid leave may be granted for personal reasons at management discretion.
- Unpaid leave must be requested at least 5 business days in advance.
- Salary deductions will be calculated based on daily rate.

4. EMERGENCY LEAVE
- Up to 3 days of paid emergency leave per year for urgent family matters (death, accident, natural disaster).
- Must notify manager immediately and provide supporting documentation within 3 days.

5. LEAVE REQUEST PROCESS
- Submit leave request through the Staff Management System.
- Manager must approve or reject within 2 business days.
- Approved leave will automatically adjust shift schedules.
- Leave cannot be approved if it causes shift staffing to fall below minimum levels.

6. PUBLIC HOLIDAYS
- All Vietnamese public holidays are observed (approximately 11 days per year).
- Employees required to work on public holidays receive 200% overtime pay.

Effective Date: January 1, 2026
Last Updated: February 15, 2026`
  },
  {
    title: "Workplace Safety Policy",
    category: "Workplace Rules",
    fileUrl: "/policies/workplace-safety",
    content: `WORKPLACE SAFETY POLICY

1. GENERAL SAFETY RULES
- All employees must follow safety procedures relevant to their work area.
- Report any unsafe conditions or hazards to management immediately.
- Keep walkways, exits, and emergency equipment accessible at all times.
- Do not operate equipment you are not trained to use.

2. EMERGENCY PROCEDURES
- Fire evacuation: Follow posted evacuation routes to designated assembly points.
- Medical emergency: Call emergency services (115) and notify the floor manager.
- Natural disaster: Follow announced procedures; do not use elevators.
- Security threat: Report to security and follow lockdown procedures.

3. FIRST AID
- First aid kits are located in each department and break room.
- Trained first aid responders are available during all shifts.
- All injuries, no matter how minor, must be reported and documented.

4. TRAINING REQUIREMENTS
- All employees must complete "Workplace Safety" training within 30 days of hire.
- Annual safety refresher training is mandatory.
- Department-specific safety training must be completed as assigned.
- Failure to complete mandatory safety training may result in suspension.

5. INCIDENT REPORTING
- All workplace incidents must be reported within 24 hours.
- An incident report form must be completed and submitted to HR.
- Investigations will be conducted for all reported incidents.

6. COMPLIANCE
- Violations of safety policies will result in disciplinary action.
- Repeated violations may lead to termination.
- All employees have the right to refuse unsafe work conditions.

Effective Date: January 1, 2026
Last Updated: January 15, 2026`
  },
  {
    title: "Overtime Policy",
    category: "Compensation",
    fileUrl: "/policies/overtime",
    content: `OVERTIME POLICY

1. DEFINITION
- Overtime is defined as work performed beyond the standard 8-hour shift.
- Maximum overtime: 4 hours per day, 40 hours per month (Vietnamese labor law).
- Maximum daily working hours (including overtime): 12 hours.

2. OVERTIME APPROVAL
- All overtime must be pre-approved by a manager through the Staff Management System.
- Employees must submit an overtime request specifying the date, expected hours, and reason.
- Managers must approve or reject overtime requests within 1 business day.
- Unauthorized overtime will not be compensated.

3. OVERTIME COMPENSATION
- Weekday overtime: 150% of hourly rate
- Weekend overtime: 200% of hourly rate
- Public holiday overtime: 300% of hourly rate
- Hourly rate calculation: Base salary / (standard working days per month × 8 hours)
  For example: 15,000,000 VND / (22 × 8) = 85,227 VND/hour

4. OVERTIME PAY CALCULATION
- Only approved overtime hours are eligible for overtime pay.
- Overtime pay is included in the monthly payroll calculation.
- The payroll summary is available on the Attendance page.

5. OVERTIME RESTRICTIONS
- Employees who have not completed mandatory training are not eligible for overtime.
- Overtime cannot be scheduled during approved leave periods.
- Employees must have at least 8 hours rest between shifts.
- Pregnant employees and employees under 18 are exempt from mandatory overtime.

6. MONITORING
- Managers can view overtime requests and approvals on the dashboard.
- Admin can view organization-wide overtime metrics.
- The system calculates and tracks overtime hours automatically.

Effective Date: January 1, 2026
Last Updated: February 1, 2026`
  }
];

async function main() {
  // Clear existing documents
  await prisma.hrDocument.deleteMany({});
  console.log("Cleared existing HR documents");

  // Seed new documents
  for (const policy of policies) {
    const doc = await prisma.hrDocument.create({ data: policy });
    console.log("Created: " + doc.title + " [" + doc.category + "]");
  }

  console.log("Done! Seeded " + policies.length + " policy documents.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
