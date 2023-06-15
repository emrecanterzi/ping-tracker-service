const CronJobManager = require("cron-manager-node");

const cronManager = new CronJobManager();

module.exports.cronManager = cronManager;
