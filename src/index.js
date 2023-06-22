const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({
  path: path.join(__dirname, "config", ".env"),
});
const mongoose = require("mongoose");
const { Job } = require("./models/JobModel");
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI);
mongoose.connection.on("connected", () => {
  console.log("mongodb connected");
});

const { cronManager } = require("./CronManager");
const { Response } = require("./models/responseModel");

const startJobs = async () => {
  const jobs = await Job.find({ isActive: true, isDeleted: false });

  jobs.forEach((job) => {
    cronManager.addJob({
      name: job.title,
      patern: "*/5 */1 * * * *",
      fn: () => {
        sendRequest(job);
      },
    });
  });
};

startJobs();

const JobStream = Job.watch({});

JobStream.on("change", async (doc) => {
  const job = await Job.findOne(doc.documentKey);

  cronManager.removeJob(job?.title);

  if (job?.isActive && !job.isDeleted) {
    cronManager.addJob({
      name: job.title,
      fn: () => {
        sendRequest(job);
      },
      patern: "*/5 */1 * * * *",
    });
    console.log("it changed ", job.title);
  } else {
    console.log(job?.title, " stop working");
  }
});

async function sendRequest(job) {
  const start = Date.now();
  const res = await axios({
    method: job.methot,
    url: job.url,
  });
  const responseTime = Date.now() - start;

  const response = new Response({
    jobId: job.jobId,
    userId: job.userId,
    date: Date.now(),
    expectedStatus: job.expectedStatus,
    status: res.status,
    maxResponseTime: job.maxResponseTime,
    responseTime: responseTime,
  });

  await response.save();

  console.log("saved");
}
