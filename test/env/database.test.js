const { expect } = require("chai");
const sinon = require("sinon").createSandbox();
const proxyquire = require("proxyquire");

describe("database", function () {
  let configObj;
  let database;
  let configFile;
  let mongodb;
  let client;

  this.timeout(10000);

  function createConfigObj() {
    return {
      mongodb: {
        url: "mongodb://someserver:27017",
        databaseName: "testDb",
        options: {
          connectTimeoutMS: 3600000, // 1 hour
          socketTimeoutMS: 3600000 // 1 hour
        }
      }
    };
  }

  function mockClient() {
    return {
      db: sinon.stub().returns({ the: "db" }),
      close: "theCloseFnFromMongoClient"
    };
  }

  function mockConfigFile() {
    return {
      read: sinon.stub().returns(configObj)
    };
  }

  function mockMongodb() {
    return {
      MongoClient: {
        connect: sinon.stub().returns(Promise.resolve(client))
      }
    };
  }

  beforeEach(() => {
    configObj = createConfigObj();
    client = mockClient();
    configFile = mockConfigFile();
    mongodb = mockMongodb();

    database = proxyquire("../../lib/env/database", {
      "./configFile": configFile,
      "mongodb":mongodb
    });
  });

  after(() => {
    sinon.restore()
  })

  describe("connect()", () => {
    it("should connect MongoClient to the configured mongodb url with the configured options", async () => {
      const db = await database.connect();
      expect(mongodb.MongoClient.connect.called).to.equal(true);
      expect(mongodb.MongoClient.connect.getCall(0).args[0]).to.equal(
        "mongodb://someserver:27017"
      );

      expect(mongodb.MongoClient.connect.getCall(0).args[1]).to.deep.equal({
        connectTimeoutMS: 3600000, // 1 hour
        socketTimeoutMS: 3600000 // 1 hour
      });

      expect(client.db.getCall(0).args[0]).to.equal("testDb");
      expect(db).to.deep.equal({
        the: "db",
        close: "theCloseFnFromMongoClient"
      });
    });

    it("should yield an error when no url is defined in the config file", async () => {
      delete configObj.mongodb.url;
      try {
        await database.connect();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal("No `url` defined in config file!");
      }
    });

    it("should yield an error when no databaseName is defined in the config file", async () => {
      delete configObj.mongodb.databaseName;
      try {
        await database.connect();
        expect.fail("Error was not thrown");
      } catch (err) {
        expect(err.message).to.equal(
          "No `databaseName` defined in config file! " +
            "See https://github.com/unbill/mongo-up#initialize-a-new-project"
        );
      }
    });

    it("should yield an error when unable to connect", async () => {
      mongodb.MongoClient.connect.returns(
        Promise.reject(new Error("Unable to connect"))
      );
      try {
        await database.connect();
      } catch (err) {
        expect(err.message).to.equal("Unable to connect");
      }
    });
  })
});
