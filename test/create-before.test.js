const { expect } = require("chai");
const sinon = require("sinon").createSandbox();
const path = require("path");

const proxyquire = require("proxyquire");

describe("create", () => {
  let create;
  let beforeDir;
  let configFile;
  let fs;

  function mockBeforeDir() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockConfigFile() {
    return {
      shouldExist: sinon.stub().returns(Promise.resolve())
    };
  }

  function mockFs() {
    return {
      copy: sinon.stub().returns(Promise.resolve())
    };
  }

  beforeEach(() => {
    beforeDir = mockBeforeDir();
    configFile = mockConfigFile();
    fs = mockFs();
    create = proxyquire("../lib/actions/create-before", {
      "../env/beforeDir": beforeDir,
      "../env/configFile": configFile,
      "fs-extra": fs
    });
  });

  after(() => {
    sinon.restore()
  })

  it("should yield an error when called without a description", async () => {
    try {
      await create(null);
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Missing parameter: description");
    }
  });

  it("should check that the before directory exists", async () => {
    await create("my_description");
    expect(beforeDir.shouldExist.called).to.equal(true);
  });

  it("should yield an error when the before directory does not exist", async () => {
    beforeDir.shouldExist.returns(
      Promise.reject(new Error("before directory does not exist"))
    );
    try {
      await create("my_description");
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("before directory does not exist");
    }
  });

  it("should not be necessary to have an config file present", async () => {
    await create("my_description");
    expect(configFile.shouldExist.called).to.equal(false);
  });

  it("should create a new always file and yield the filename", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    const filename = await create("my_description");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../samples/before-after.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), "before", "20160609080700-my_description.js")
    );
    expect(filename).to.equal("20160609080700-my_description.js");
    clock.restore();
  });

  it("should replace spaces in the description with underscores", async () => {
    const clock = sinon.useFakeTimers(
      new Date("2016-06-09T08:07:00.077Z").getTime()
    );
    await create("this description contains spaces");
    expect(fs.copy.called).to.equal(true);
    expect(fs.copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, "../samples/before-after.js")
    );
    expect(fs.copy.getCall(0).args[1]).to.equal(
      path.join(
        process.cwd(),
        "before",
        "20160609080700-this_description_contains_spaces.js"
      )
    );
    clock.restore();
  });

  it("should yield errors that occurred when copying the file", async () => {
    fs.copy.returns(Promise.reject(new Error("Copy failed")));
    try {
      await create("my_description");
      expect.fail("Error was not thrown");
    } catch (err) {
      expect(err.message).to.equal("Copy failed");
    }
  });
});
