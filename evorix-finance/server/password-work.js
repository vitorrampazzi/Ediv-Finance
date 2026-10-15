// Argon2 deliberately uses memory and CPU. Keep at most two jobs in flight
// in each instance; an unbounded queue would turn a burst into memory pressure.
const MAXIMUM_PASSWORD_JOBS = 2;
let activeJobs = 0;

export async function withPasswordWork(work) {
  if (activeJobs >= MAXIMUM_PASSWORD_JOBS) {
    throw Object.assign(new Error("Password processing is busy"), {
      code: "PASSWORD_WORK_BUSY",
      status: 503,
      retryAfter: 2,
    });
  }
  activeJobs += 1;
  try {
    return await work();
  } finally {
    activeJobs -= 1;
  }
}
