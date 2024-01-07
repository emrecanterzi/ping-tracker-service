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
const { Response } = require("./models/ResponseModel");
const { Times } = require("./models/TimesModel");

let times = [];
const TimesStream = Times.watch({});

TimesStream.on("change", async (doc) => {
  times = await Times.find();
});

const startJobs = async () => {
  times = await Times.find();
  const jobs = await Job.find({ isActive: true, isDeleted: false });

  jobs.forEach((job) => {
    cronManager.addJob({
      name: job.title,
      patern:
        times.find((time) => time.timeId == job.delay).cronExpression ||
        "0 */10 * * * *",

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
    console.log(times.find((time) => time.timeId == job.delay).cronExpression);
    cronManager.addJob({
      name: job.title,
      fn: () => {
        sendRequest(job);
      },
      patern:
        times.find((time) => time.timeId == job.delay).cronExpression ||
        "0 */10 * * * *",
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
      responseBody: res.data,
      responseHeaders: res.headers,
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
