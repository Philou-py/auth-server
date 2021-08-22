import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";
import { validateBody, ValidationSchema, handleErrors } from "./helpers";
import UserModel from "./models/User";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await hash(password, 10);
  try {
    const user = await UserModel.create({ email, password: hashedPassword });
    res.status(201).json(user);
  } catch (err) {
    handleErrors(err, res);
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).send({ error: "User not found" });
    } else {
      const validPassword = await compare(password, user.password);
      if (!validPassword) {
        res.status(403).send({ error: "Invalid password" });
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
    res.status(401).send({ error: "You are not authenticated" });
  } else {
    try {
      const userId = verify(req.cookies.jwt!, process.env.APP_SECRET!);
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "User not found" });
      } else {
        // delete currentUser.password;
        res.send({ data: currentUser });
      }
    } catch (error) {
      res.status(400).send({ error: "Wrong jwt" });
    }
  }
});

router.get("/logout", async (req, res) => {
  res.clearCookie("jwt").send({ msg: "You are now logged out!" });
});

router.post("/modify-user", async (req, res) => {
  const jwt = req.cookies.jwt;
  if (!jwt) {
    res.status(401).send({ error: "You are not authenticated" });
  } else {
    try {
      const userId = verify(req.cookies.jwt!, process.env.APP_SECRET!);
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        res.status(400).send({ error: "User not found" });
      } else {
        const validPassword = await compare(req.body.oldPassword, currentUser.password);
        if (!validPassword) {
          res.status(403).send({ error: "Invalid password" });
        } else {
          const hashedPassword = await hash(req.body.password, 10);
          currentUser.updateOne({ ...req.body, password: hashedPassword });
          res.send({ data: currentUser });
        }
      }
    } catch (error) {
      res.status(400).send({ error: "Wrong jwt" });
    }
  }
});

export default router;
