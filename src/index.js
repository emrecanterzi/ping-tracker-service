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
  const job = await Job.findOne();

  cronManager.addJob({
    name: job.title,
    patern: "*/3 * * * * *",
    fn: () => {
      console.log(job.title);
    },
  });

  // await testRequest(job);
};

startJobs();

// const testRequest = async (job) => {
//   console.log(job);
//   const start = Date.now();
//   const res = await axios({
//     method: job.methot,
//     url: job.url,
//   });
//   const responseTime = Date.now() - start;

//   console.log(responseTime);
//   console.log(res.status);

//   if (responseTime > job.maxResponseTime) {
//     console.log("here");
//   }
//   if (res.status !== job.expectedStatus) {
//     console.log("here");
//   }
// };

const JobStream = Job.watch({});

JobStream.on("change", async (doc) => {
  const job = await Job.findOne(doc.documentKey);
  cronManager.removeJob(job.title);
  cronManager.addJob({
    name: job.title,
    fn: () => {
      console.log(job.title);
    },
    patern: "*/3 * * * * *",
  });
  console.log("it changed");
});
