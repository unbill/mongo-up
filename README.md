# mongo-up
[![Build Status](https://travis-ci.com/unbill/mongo-up.svg?branch=master)](https://travis-ci.com/unbill/mongo-up)

A database migration tool for MongoDB in Node. This project was forked from migrate-mongo, and enhanced with the capability to
have "run always" scripts before or after the deployment. This is convenient when applying indexes or other structures that should 
always be run idempotently.

### V6 Breaking Changes
Note: As of V6, mongodb is specified as a peer dependency. It must be added as a dependency to your migration project.

## Installation
````bash
$ npm install -g mongo-up
````

## CLI Usage
````
$ mongo-up
Usage: mongo-up [options] [command]


  Commands:

  init                          initialize a new migration project
    create [description]        create a new database migration with the provided description
    create-before [description] create a new database script that always runs before migrations with the provided description
    create-after [description]  create a new database script that always runs after migrations with the provided description
    up [options]                run all unapplied database migrations
    down [options]              undo the last applied database migration
    status [options]            print the changelog of the database

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
````

## Quickstart
### Initialize a new project
Make sure you have [Node.js](https://nodejs.org/en/) 7.6.0 (or higher) installed.  

Create a directory where you want to store your migrations for your mongo database (eg. 'albums' here) and cd into it
````bash
$ mkdir albums-migrations
$ cd albums-migrations
````

Initialize a new mongo-up project
````bash
$ mongo-up init
Initialization successful. Please edit the generated mongo-up-config.js file
````

The above command did two things: 
1. create a sample 'mongo-up-config.js' file and 
2. create a 'migrations' directory

Edit the mongo-up-config.js file. 
An object or Promise can be returned. A Promise would be returned if you need to call an external API like the AWS SDK to get configuration information.

#### Static file example
Make sure you change the mongodb url: 
````javascript
// In this file you can configure mongo-up

module.exports = {
  mongodb: {
    // TODO Change (or review) the url to your MongoDB:
    url: "mongodb://localhost:27017",

    // TODO Change this to your database name:
    databaseName: "YOURDATABASENAME",

    options: {
      useNewUrlParser: true // removes a deprecation warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The before dir, can be an relative or absolute path. Only edit this when really necessary.
  beforeDir: "before",

  // The before dir, can be an relative or absolute path. Only edit this when really necessary.
  afterDir: "after",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog"
};
````

#### Promise example
````javascript
// In this file you can configure migrate-mongo
const AWS = require('aws-sdk')

const ssm = new AWS.SSM()
const params = {
  Name: process.env.MONGO_CONNECTION_KEY, 
  WithDecryption: true
}

module.exports = ssm.getParameter(params).promise().then(data => {
  const url = data.Parameter.Value
  const dbName = url.split("?")[0].split("/").pop()

  const mongoSettings = {
    // TODO Change (or review) the url to your MongoDB:
    url: data.Parameter.Value,
  
    // TODO Change this to your database name:
    databaseName: dbName,
  
    options: {
      useNewUrlParser: true // removes a deprecation warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  }

  return {
    mongodb: mongoSettings,

    // The before dir, can be an relative or absolute path. Only edit this when really necessary.
    beforeDir: "before",
  
    // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
    migrationsDir: "migrations",

    // The after dir, can be an relative or absolute path. Only edit this when really necessary.
    afterDir: "after",
  
    // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
    changelogCollectionName: "changelog"
  }
})
````

### Creating a new migration script
To create a new database migration script, just run the ````mongo-up create [description]```` command.

For example:
````bash
$ mongo-up create blacklist_the_beatles
Created: migrations/20160608155948-blacklist_the_beatles.js
````

A new migration file is created in the 'migrations' directory:
````javascript
module.exports = {
  up(db) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
    // See https://github.com/unbill/mongo-up/#creating-a-new-migration-script
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.
The ````db```` object contains [the official MongoDB db object](https://www.npmjs.com/package/mongodb)

There are 3 options to implement the `up` and `down` functions of your migration: 
1. Return a Promise
2. Use async-await 
3. Call a callback (deprecated)

Always make sure the implementation matches the function signature:
* `function up(db) { /* */ }` should return `Promise`
* `function async up(db) { /* */ }` should contain `await` keyword(s) and return `Promise`
* `function up(db, next) { /* */ }` should callback `next`

#### Example 1: Return a Promise
````javascript
module.exports = {
  up(db) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  down(db) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

#### Example 2: Use async & await
Async & await is especially useful if you want to perform multiple operations against your MongoDB in one migration.

````javascript
module.exports = {
  async up(db) {
    await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 5}});
  },

  async down(db) {
    await db.collection('albums').updateOne({artist: 'The Doors'}, {$set: {stars: 0}});
    await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  },
};
````

#### Example 3: Call a callback (deprecated)
Callbacks are supported for backwards compatibility.
New migration scripts should be written using Promises and/or async & await. It's easier to read and write.

````javascript
module.exports = {
  up(db, callback) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}}, callback);
  },

  down(db, callback) {
    return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}}, callback);
  }
};
````

### Creating a new 'before' or 'after' script
To create a new database before or after script, just run ````mongo-up create-before [description]```` or
````mongo-up create-after [description]````. As the names imply, these scripts get 
run each time either before or after the database migration is run. 
These scripts are good for tasks like ensuring indexes on each migration run.

For example:
````bash
$ mongo-up create-after blacklist_the_beatles_idx
Created: after/20160608155948-blacklist_the_beatles_idx.js
````

A new migration file is created in the 'before' or 'after' directory.
Always scripts only contain an 'up' as they are not a migration.
````javascript
module.exports = {
  up(db) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
    // See https://github.com/unbill/mongo-up/#creating-a-new-migration-script
    // Example:
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  }
};
````


### Checking the status of the migrations
At any time, you can check which migrations are applied (or not)

````bash
$ mongo-up status
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````


### Migrate up
This command will apply all pending migrations
````bash
$ mongo-up up
MIGRATED UP: 20160608155948-blacklist_the_beatles.js
````

If an an error occurred, it will stop and won't continue with the rest of the pending migrations

If we check the status again, we can see the last migration was successfully applied:
````bash
$ mongo-up status
┌─────────────────────────────────────────┬──────────────────────────┐
│ Filename                                │ Applied At               │
├─────────────────────────────────────────┼──────────────────────────┤
│ 20160608155948-blacklist_the_beatles.js │ 2016-06-08T20:13:30.415Z │
└─────────────────────────────────────────┴──────────────────────────┘
````

### Migrate down
With this command, mongo-up will revert (only) the last applied migration

````bash
$ mongo-up down
MIGRATED DOWN: 20160608155948-blacklist_the_beatles.js
````

If we check the status again, we see that the reverted migration is pending again:
````bash
$ mongo-up status
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘
````

## Using a custom config file
All actions (except ```init```) accept an optional ````-f```` or ````--file```` option to specify a path to a custom config file.
By default, mongo-up will look for a ````mongo-up-config.js```` config file in of the current directory.

### Example:

````bash
$ mongo-up status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````

## API Usage

```javascript
const {
  init,
  create,
  database,
  config,
  up,
  down,
  status
} = require('mongo-up');
```

### `init() → Promise`

Initialize a new mongo-up project
```javascript
await init();
```

The above command did two things: 
1. create a sample `mongo-up-config.js` file and 
2. create a `migrations` directory

Edit the `mongo-up-config.js` file. Make sure you change the mongodb url.

### `create(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create('blacklist_the_beatles');
console.log('Created:', fileName);
```

A new migration file is created in the `migrations` directory.

### `create-before(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create-before('blacklist_the_beatles_before');
console.log('Created:', fileName);
```

A new always-before file is created in the `before` directory.

### `create-after(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create-after('blacklist_the_beatles_after');
console.log('Created:', fileName);
```

A new always-after file is created in the `after` directory.

### `database.connect() → Promise<MongoDb>`

Connect to a mongo database using the connection settings from the `mongo-up-config.js` file.

```javascript
const db = await database.connect();
```

### `config.read() → Promise<JSON>`

Read connection settings from the `mongo-up-config.js` file.

```javascript
const mongoConnectionSettings = await config.read();
```

### `up(MongoDb) → Promise<Array<fileName>>`

Apply all pending migrations

```javascript
const db = await database.connect();
const migrated = await up(db);
migrated.forEach(fileName => console.log('Migrated:', fileName));
```

If an an error occurred, the Promise will reject and won't continue with the rest of the pending migrations.

### `down(MongoDb) → Promise<Array<fileName>>`

Revert (only) the last applied migration

```javascript
const db = await database.connect();
const migratedDown = await down(db);
migratedDown.forEach(fileName => console.log('Migrated Down:', fileName));
```

### `status(MongoDb) → Promise<Array<{ fileName, appliedAt }>>`

Check which migrations are applied (or not.

```javascript
const db = await database.connect();
const migrationStatus = await status(db);
migrationStatus.forEach(({ fileName, appliedAt }) => console.log(fileName, ':', appliedAt));
```

### `db.close() → Promise`
Close the database connection

```javascript
const db = await database.connect();
await db.close()
```
