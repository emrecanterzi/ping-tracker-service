const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config({
  path: path.join(__dirname, "config", ".env"),
});
const mongoose = require("mongoose");
const { Job } = require("./models/JobModel");
const MONGO_URI = process.env.MONGO_URI;

const { cronManager } = require("./CronManager");
const { Response } = require("./models/responseModel");

const startJobs = async () => {
  const jobs = await Job.find({ isActive: true, isDeleted: false });

  jobs.forEach((job) => {
    cronManager.addJob({
      name: job.title,
      patern: "*/10 * * * * *",
      fn: () => {
        sendRequest(job);
      },
    });
  });
};

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
      patern: "*/10 * * * * *",
    });
    console.log("it changed ", job.title);
  } else {
    console.log(job?.title, " stop working");
  }
});

async function sendRequest(job) {
  try {
    const start = Date.now();

    const res = await axios({
      method: job.method,
      url: job.url,
      data: job.requestBody,
      headers: job.requestHeaders,
      validateStatus: () => true,
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
      requestBody: job.requestBody,
      requestHeaders: job.requestHeaders,
    });

    await response.save();

    console.log("saved");
  } catch (err) {
    console.log(job.title);
    console.log(err.name);
  }
}

mongoose.connect(MONGO_URI);
mongoose.connection.on("connected", () => {
  console.log("mongodb connected");
  startJobs();
});
