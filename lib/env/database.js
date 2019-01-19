const configFile = require("./configFile");
const { MongoClient } = require("mongodb");
const _ = require("lodash");

module.exports = {
  async connect() {
    const config = await configFile.read();
    const url = _.get(config, "mongodb.url");
    const databaseName = _.get(config, "mongodb.databaseName");
    const options = _.get(config, "mongodb.options");

    if (!url) {
      throw new Error("No `url` defined in config file!");
    }

    if (!databaseName) {
      throw new Error(
        "No `databaseName` defined in config file! " +
          "See https://github.com/unbill/mongo-up#initialize-a-new-project"
      );
    }

    const client = await MongoClient.connect(
      url,
      options
    );

    const db = client.db(databaseName);
    db.close = client.close;
    return db;
  }
};
