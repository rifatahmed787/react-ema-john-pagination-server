const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
// const stripe = require("stripe")(process.env.STRIPE_KEY);

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

//jwt middleware function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(403).send("Unauthorized access");
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden acccess" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    //mongodb collections
    const productsCollection = client.db("emaJohn").collection("products");
    const categoryCollection = client.db("emaJohn").collection("category");
    const addToCartCollection = client.db("emaJohn").collection("addToCart");
    const allUsersCollection = client.db("emaJohn").collection("allUsers");

    // jwt access token
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "6h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await allUsersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

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

    //get method for checking admin in useAdmin hook
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await allUsersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    //get products on limits
    app.get("/featured", async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const services = await cursor.limit(8).toArray();
      res.send(services);
    });

    //category items get method
    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    //get addtocart by email
    app.get("/addtocart/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email: email };
      const result = await addToCartCollection.find(query).toArray();
      res.send(result);
    });

    //get users by get method
    app.get("/allusers", async (req, res) => {
      const user = req.body;
      const query = {};
      const filter = await allUsersCollection.find(query).toArray();
      res.send(filter);
    });

    //post method for users

    app.post("/allusers", async (req, res) => {
      const user = req.body;
      const result = await allUsersCollection.insertOne(user);
      console.log(result);
      res.send(result);
    });

    app.post("/addtocart", async (req, res) => {
      const cart = req.body;
      const result = await addToCartCollection.insertOne(cart);
      res.send(result);
    });

    //admin role update
    app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await allUsersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.send(result);
    });

    //put method for verified seller
    app.put("/users/verify/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await allUsersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //clear cart
    app.delete("/clearcart", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await addToCartCollection.deleteMany(query);
      res.send(result);
    });

    //delete item from cart
    app.delete("/deleteitem/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const result = await addToCartCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.error(error));

app.listen(port, () => {
  console.log(`port is running on ${port}`);
});
