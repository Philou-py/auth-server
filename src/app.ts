import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./authRoutes";
import cookieParser from "cookie-parser";

const app = express();

// express json parser middleware
app.use(express.json());
app.use(cookieParser());

// CORS library initialisation allowing all subdomains from https://toccatech.com and all localhost servers
app.use(
  cors({
    origin: [
      /^https:\/\/.*toccatech.com$/,
      /^(http|https):\/\/localhost:[0-9]{1,6}$/,
      /^(http|https):\/\/surface-laptop3-philippe:[0-9]{1,6}$/,
    ],
    credentials: true,
  })
);
// Helmet initialisation with all the defaults
app.use(helmet());

app.listen(3003, () => {
  console.log("Server listening on port 3003! App url: http://localhost:3003");
});

app.get("/", (req, res) => {
  res.send({
    ok: true,
    message: "The application is currently under active development!",
  });
});

app.use(authRoutes);
