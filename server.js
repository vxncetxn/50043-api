const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql");
const { MongoClient } = require("mongodb");
const { hosts } = require("./hosts.js");

const app = express();
const connection = mysql.createConnection({
  host: hosts.MYSQL_HOST,
  user: "api-user",
  password: "password",
});
const uri = `mongodb://${hosts.MONGO_HOST}:27017/?poolSize=20&w=majority`;

async function connect() {
  app.listen(3001);
  console.log("API listening on localhost:3001");
}

connection.connect();
connection.changeUser({
  database: "reviews",
});
MongoClient.connect(uri, async (error, client) => {
  console.log("Connected to MongoDB");
  const db = client.db("books_proj");
  const metadata = db.collection("metadata");
  const logs = db.collection("logs");

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.post("/api/item", (req, res) => {
    const reqTime = new Date();
    try {
      metadata.insertOne({});

      logs.insertOne({
        unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
        reqType: "POST item",
        params: {},
        resCode: 201,
      });

      return res.status(201).json({});
    } catch (err) {
      return res
        .status(400)
        .json({ message: "There was a problem posting the item." });
    }
  });

  app.post("/api/review", (req, res) => {
    const reqTime = new Date();
    try {
      logs.insertOne({
        unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
        reqType: "POST review",
        params: {},
        resCode: 201,
      });

      return res.status(201).json({});
    } catch (err) {
      return res
        .status(400)
        .json({ message: "There was a problem posting the review." });
    }
  });

  app.get("/api/items", async (req, res) => {
    const reqTime = new Date();
    try {
      const quant = 20;
      const page = req.query.page;
      // const search = req.query.search;
      const cursor = await metadata
        // .find(search ? { asin: new RegExp(search, "i") } : null)
        .find()
        .skip((page - 1) * quant)
        .limit(quant);
      const mongoOut = await cursor.toArray();

      if (mongoOut.length) {
        connection.query(
          `SELECT COUNT(asin) AS num, AVG(overall) AS stars, asin FROM kindle_reviews WHERE asin IN (${mongoOut
            .map((n) => `'${n.asin}'`)
            .join(", ")}) GROUP BY asin;`,
          function (error, results, fields) {
            if (error) throw error;
            const resultsMap = {};
            results.forEach(({ asin, num, stars }) => {
              resultsMap[asin] = { num, stars };
            });

            logs.insertOne({
              unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
              reqType: "GET items",
              params: { page },
              resCode: 200,
            });

            return res.status(200).json({
              data: mongoOut.map((n) => {
                return {
                  asin: n.asin,
                  imUrl: n.imUrl,
                  num: resultsMap[n.asin] ? resultsMap[n.asin].num : 0,
                  stars: resultsMap[n.asin] ? resultsMap[n.asin].stars : null,
                };
              }),
            });
          }
        );
      } else {
        logs.insertOne({
          unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
          reqType: "GET items",
          params: { page },
          resCode: 200,
        });

        return res.status(200).json({
          data: [],
        });
      }
    } catch (err) {
      logs.insertOne({
        unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
        reqType: "GET items",
        params: { page: req.query.page },
        resCode: 400,
      });

      return res.status(400).json({
        message: "There was a problem getting the items.",
      });
    }
  });

  app.get("/api/item/:asin", async (req, res) => {
    const reqTime = new Date();
    try {
      const doc = await metadata.findOne({ asin: req.params.asin });

      if (doc) {
        connection.query(
          `SELECT * FROM kindle_reviews WHERE asin = '${doc.asin}'`,
          function (error, results, fields) {
            if (error) throw error;

            logs.insertOne({
              unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
              reqType: "GET one item",
              params: { asin: req.params.asin },
              resCode: 200,
            });

            return res.status(200).json({
              data: { ...doc, reviews: results },
            });
          }
        );
      } else {
        logs.insertOne({
          unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
          reqType: "GET one item",
          params: { asin: req.params.asin },
          resCode: 200,
        });

        return res.status(200).json({
          data: doc,
        });
      }
    } catch (err) {
      logs.insertOne({
        unixTime: parseInt((reqTime.getTime() / 1000).toFixed(0)),
        reqType: "GET one item",
        params: { asin: req.params.asin },
        resCode: 400,
      });

      return res.status(400).json({
        message: "There was a problem getting the item.",
      });
    }
  });

  app.get("/api/count", async (req, res) => {
    try {
      const cursor = await metadata.countDocuments();

      return res.status(200).json({
        data: cursor,
      });
    } catch (err) {
      return res.status(400).json({
        message: "There was a problem getting the count.",
      });
    }
  });

  connect();
});
