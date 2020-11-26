const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const uri = `mongodb://${process.env.MONGO_HOST}:27017/?poolSize=20&w=majority`;

async function connect() {
  app.listen(3001);
  console.log("API listening on localhost:3001");
}

MongoClient.connect(uri, async (error, client) => {
  console.log("Connected to MongoDB");
  const db = client.db("books-proj");
  const metadata = db.collection("metadata");

  // const cursor = await metadata.find().limit(3);
  // const result = await cursor.toArray();
  // // cursor.forEach((d) => console.log(d));
  // console.log("LOOK HERE: ", result);

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // app.post("/api/trial", (req, res) => {
  //   try {
  //     console.log(req);
  //   } catch (err) {
  //     return res.status(400).json({ message: "Something went wrong." });
  //   }
  // });

  app.get("/api/items", async (req, res) => {
    try {
      const quant = 20;
      const page = req.query.page;
      const cursor = await metadata
        .find()
        .skip((page - 1) * quant)
        .limit(quant);
      const data = await cursor.toArray();

      res.json({
        data,
      });
    } catch (err) {
      return res.status(400).json({
        message: "There was a problem getting the users",
      });
    }
  });

  app.get("/api/count", async (req, res) => {
    try {
      const cursor = await metadata.countDocuments();
      const data = await cursor.toArray();

      res.json({
        data,
      });
    } catch (err) {
      return res.status(400).json({
        message: "There was a problem getting the users",
      });
    }
  });

  connect();
});
