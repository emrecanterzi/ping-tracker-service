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

const startJobs = async () => {
  const jobs = await Job.find();

  jobs.forEach((job) => {
    cronManager.addJob({
      name: job.title,
      patern: "*/5 */1 * * * *",
      fn: () => {
        testRequest(job);
      },
    });
  });
};

startJobs();

const JobStream = Job.watch({});

JobStream.on("change", async (doc) => {
  const job = await Job.findOne(doc.documentKey);
  cronManager.removeJob(job.title);
  cronManager.addJob({
    name: job.title,
    fn: () => {
      testRequest(job);
    },
    patern: "*/5 */1 * * * *",
  });
  console.log("it changed ", job.title);
});

async function testRequest(job) {
  const start = Date.now();
  const res = await axios({
    method: job.methot,
    url: job.url,
  });
  const responseTime = Date.now() - start;

  console.log(responseTime);
  console.log(res.status);

  if (responseTime > job.maxResponseTime) {
    console.log(
      "max response time exceeded expected is " +
        job.maxResponseTime +
        " response is " +
        responseTime
    );
  } else {
    console.log("no problem with maximum response time");
  }
  if (res.status !== job.expectedStatus) {
    console.log(
      "status does not match expected status is " +
        job.expectedStatus +
        " response is " +
        res.status
    );
  } else {
    console.log("no problem with maximum response time");
  }
}
