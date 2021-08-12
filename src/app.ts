import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connect } from "mongoose";
import authRoutes from "./authRoutes";

dotenv.config();

const app = express();

// express json parser middleware
app.use(express.json());

// CORS library initialisation allowing all subdomains from https://toccatech.com and all localhost servers
app.use(
  cors({
    origin: [/^https:\/\/.*toccatech.com$/, /^(http|https):\/\/localhost:[0-9]{1,6}$/],
  })
);
// Helmet initialisation with all the defaults
app.use(helmet());

// Connect to MongoDB
connect(
  `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_HOST}/raspiauth?authSource=admin`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }
)
  .then(() => {
    app.listen(3000, () => {
      console.log("Server listening on port 3000! App url: http://localhost:3000");
    });
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  res.send({
    ok: true,
    message: "The application is currently under active development!",
  });
});

app.use(authRoutes);
