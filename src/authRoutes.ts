import { Router } from "express";
import { logger } from "./helpers";
import UserModel from "./models/User";
const router = Router();

// Handle errors
const handleErrors = (err: any) => {
  console.log("message d'erreur :", err.message, "code d'erreur :", err.code);
  let errors: Record<string, string> = {};

  // duplicate error
  if (err.code === 11000) {
    errors.email = "That email is already registered";
    return errors;
  }

  // validation errors
  if (err.message.includes("user validation failed")) {
    Object.values(err.errors as object).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

// Ecrire ici les lignes de code pour la création des routes
router.post("/signup", logger, async (req, res) => {
  const { email, password } = req.body;
  // console.log("email:", email, "pwd:", pwd);
  // res.send("new signup");
  try {
    const user = await UserModel.create({ email, password });
    res.status(201).json(user);
    // Deuxième façon
    // const newUser = new UserModel({ email, password });
    // await newUser.save();
    // res.send(newUser);
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
});

router.post("/signin", logger, async (req, res) => {
  // console.log(req.body);
  const { email, pwd } = req.body;
  console.log("email:", email, "pwd:", pwd);
  res.send("user login");
});

export default router;
