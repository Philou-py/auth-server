import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { validateBody, ValidationSchema, handleErrors } from "./helpers";
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
        const jwt = sign(user.id, process.env.APP_SECRET!);
        res
          .cookie("jwt", jwt, { httpOnly: true })
          .status(200)
          .send({ msg: `Welcome, ${email}!` });
      }
    }
  } catch (error) {
    res.status(500).send({ error });
  }
});

router.get("/current-user", async (req, res) => {
  const jwt = req.cookies.jwt;
  if (!jwt) {
    res.status(401).send({ error: "You are not authenticated!" });
  } else {
    try {
      const userId = verify(req.cookies.jwt!, process.env.APP_SECRET!);
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "The current user was not found!" });
      } else {
        // delete currentUser.password;
        res.send({ data: currentUser });
      }
    } catch (error) {
      res.status(400).send({ error: "The JWT provided is not authentic!" });
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
    try {
      const userId = verify(req.cookies.jwt!, process.env.APP_SECRET!);
      let currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "User not found" });
      } else {
        const validPassword = await compare(req.body.oldPassword, currentUser.password);
        if (!validPassword) {
          res.status(403).send({ error: "The password is invalid!" });
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
    } catch (error) {
      console.log(error);
      res.status(400).send({ error: "The JWT provided is not authentic!" });
    }
  }
});

export default router;
