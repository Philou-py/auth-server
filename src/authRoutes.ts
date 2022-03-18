import fs from "fs";
import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { validateBody, ValidationSchema, handleErrors, verifyJWT } from "./helpers";
import UserModel from "./models/User";

const router = Router();

const authBodySchema: ValidationSchema = {
  email: {
    type: "string",
    required: true,
    regExp: /^[a-z]+(\.[a-z]+)?@[a-z]+\.[a-z]+(\.[a-z]+)?$/,
    errorMessage: "The field email is required and must be valid!",
  },
  password: {
    type: "string",
    required: true,
    minLength: 6,
    errorMessage: "The field password is required and must contain at least 6 characters!",
  },
};

const privateKey = fs.readFileSync("./rsa_1024_priv.pem", "utf-8");
const publicKey = fs.readFileSync("./rsa_1024_pub.pem", "utf-8");

router.post("/signup", validateBody(authBodySchema), async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await hash(password, 10);
  try {
    const user = await UserModel.create({ email, password: hashedPassword });
    res.status(201).json(user);
  } catch (err) {
    handleErrors(err, res);
  }
});

router.post("/signin", validateBody(authBodySchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).send({ error: "The provided email does not correspond to a known user!" });
    } else {
      const validPassword = await compare(password, user.password);
      if (!validPassword) {
        res.status(403).send({ error: "The password is invalid!" });
      } else {
        const jwt = sign(
          {
            "https://toccatech.com/jwt/claims": {
              ROLE: "USER",
              USER: user.id,
              EMAIL: user.email,
              isAuthenticated: true,
            },
          },
          privateKey,
          {
            issuer: "Toccatech Corporation",
            subject: "Toccatech Users",
            audience: "https://toccatech.com",
            expiresIn: 60 * 60 * 24 * 14, // Two weeks
            algorithm: "RS256",
          }
        );
        res
          .cookie("jwt", jwt, { httpOnly: true })
          .status(200)
          .send({ msg: `Welcome, ${email}!` });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});

router.get("/current-user", async (req, res) => {
  const jwt = req.cookies.jwt;
  if (!jwt) {
    res.status(401).send({ error: "You are not authenticated!" });
  } else {
    const payload = verifyJWT(req.cookies.jwt!, res);
    if (payload) {
      const userId = payload["https://toccatech.com/jwt/claims"].USER;
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "The current user was not found!" });
      } else {
        // delete currentUser.password;
        res.send({ data: currentUser });
      }
    }
  }
});

router.get("/logout", async (req, res) => {
  res.clearCookie("jwt").send({ msg: "You are now logged out!" });
});

const modifyUserBodySchema: ValidationSchema = {
  ...authBodySchema,
  email: {
    ...authBodySchema.email,
    required: false,
  },
  password: {
    ...authBodySchema.password,
    required: false,
  },
  oldPassword: {
    type: "string",
    required: true,
    errorMessage: "The old password must be provided!",
  },
};

router.post("/modify-user", validateBody(modifyUserBodySchema), async (req, res) => {
  const jwt = req.cookies.jwt;
  if (!jwt) {
    res.status(401).send({ error: "You are not authenticated!" });
  } else {
    const payload = verifyJWT(req.cookies.jwt!, res);
    if (payload) {
      const userId = payload["https://toccatech.com/jwt/claims"].USER;
      let currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "User not found" });
      } else {
        const validPassword = await compare(req.body.oldPassword, currentUser.password);
        if (!validPassword) {
          res.status(403).send({ error: "The old password is invalid!" });
        } else {
          let update = { ...req.body };
          if (req.body.password) {
            const hashedPassword = await hash(req.body.password, 10);
            update.password = hashedPassword;
          }
          try {
            await currentUser.updateOne(update);
            currentUser = await UserModel.findById(userId);
          } catch (error) {
            res.status(500).send({ error });
          }
          res.send({ data: currentUser });
        }
      }
    }
  }
});

export default router;
