const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("hello ema john");
});

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bathfkv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCollection = client.db("emaJohn").collection("products");
    const categoryCollection = client.db("emaJohn").collection("category");

    //get products by pagination
    app.get("/products", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      console.log(page, size);
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor
        .skip(page * size)
        .limit(size)
        .toArray();
      const count = await productsCollection.estimatedDocumentCount();
      res.send({ count, products });
    });

    //get products on limits
    app.get("/featured", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const services = await cursor.limit(6).toArray();
      res.send(services);
    });

    //category items get method
    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/productsByIds", async (req, res) => {
      const ids = req.body;
      // console.log(ids);
      const productsIds = ids.map((id) => ObjectId(id));
      const query = { _id: { $in: productsIds } };
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });
  } finally {
  }
}
run().catch((error) => console.error(error));

app.listen(port, () => {
  console.log(`port is running on ${port}`);
});
