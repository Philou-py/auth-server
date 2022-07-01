import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./authRoutes";
import cookieParser from "cookie-parser";

const DOMAIN1 = process.env.DOMAIN1 || "";
const DOMAIN2 = process.env.DOMAIN2 || "";
const PORT = process.env.APP_PORT || 3003;
const DGRAPH_URL = process.env.DB_URL || "https://dgraph.toccatech.com/graphql";
const FILE_SERVER_URL = process.env.FILE_SERVER_URL || "https://file-server.toccatech.com";
const AUTH_COOKIE = process.env.AUTH_COOKIE || "X-Toccatech-Auth";
const JWT_ISS = process.env.JWT_ISS || "Toccatech Corporation";
const JWT_SUB = process.env.JWT_SUB || "Toccatech Users";
const JWT_AUD = process.env.JWT_AUD || "https://toccatech.com";
const JWT_CLAIMS = process.env.JWT_CLAIMS || "https://toccatech.com/jwt/claims";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [/^(http|https):\/\/localhost:[0-9]{1,6}$/, DOMAIN1, DOMAIN2],
    credentials: true,
  })
);
app.use(helmet());

app.get("/", (req, res) => {
  res.send({
    msg: "Welcome to Auth Server! This API enables applications to sign up, sign in and sign out users easily, with a secure asymmetric authentication system.",
  });
});

app.use(authRoutes);

app.use((req, res) => {
  res.status(404).send({ error: "Cette route n'existe pas !" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
  console.log(`App url: http://localhost:${PORT}`);
  console.log(`Database URL: ${DGRAPH_URL}`);
  console.log(`File Server URL: ${FILE_SERVER_URL}`);
  console.log(`Using the following cookie name for authentication: ${AUTH_COOKIE}`);
  console.log(`JWT issuer: ${JWT_ISS}`);
  console.log(`JWT subject: ${JWT_SUB}`);
  console.log(`JWT audience: ${JWT_AUD}`);
  console.log(`JWT claims namespace: ${JWT_CLAIMS}`);
  console.log(
    DOMAIN1 ? `CORS whitelisted domain(s): ${DOMAIN1}${DOMAIN2 ? `, ${DOMAIN2}` : ""}\n` : ""
  );
});
