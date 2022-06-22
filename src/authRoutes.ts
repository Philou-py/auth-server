import fs from "fs";
import { Router } from "express";
import { hash, compare } from "bcryptjs";
import {
  validateBody,
  ValidationSchema,
  generateAdminJwt,
  generateUserJwt,
  JWT_MAX_AGE,
} from "./helpers";
import axios from "axios";

const router = Router();
const DGRAPH_URL = "https://dgraph.toccatech.com/graphql";
const privateKey = fs.readFileSync("./rsa_1024_priv.pem", "utf-8");

const ADD_USER = `
  mutation AddUser($addUserInput: [AddUserInput!]!) {
    addUser(input: $addUserInput) {
      user {
        id
        email
        userProfile {
          id
          username
          avatarURL
        }
      }
    }
  }
`;

const QUERY_USER = `
  query QueryUserProfile($filter: UserProfileFilter) {
    queryUserProfile(filter: $filter) {
      id
      username
      avatarURL
      userAccount {
        id
        email
        password
      }
    }
  }
`;

const signUpBodySchema: ValidationSchema = {
  email: {
    type: "string",
    required: true,
    regExp: /^[a-z]+(\.[a-z]+)?@[a-z]+\.[a-z]+(\.[a-z]+)?$/,
    errorMessage: "The field 'email' is required and must be valid!",
  },
  password: {
    type: "string",
    required: true,
    minLength: 6,
    errorMessage: "The field 'password' is required and must contain at least 6 characters!",
  },
  username: {
    type: "string",
    required: true,
    errorMessage: "The field 'username' is required!",
  },
  avatarURL: {
    type: "string",
    regExp: /^(http|https):\/\/file-server\.toccatech.com\/files\/[^ "\/]+$/,
    errorMessage:
      "The field 'avatarURL' is invalid! The URL must necessarily point to a file on the Toccatech File Server!",
  },
};

router.post("/signup", validateBody(signUpBodySchema), async (req, res) => {
  const { email, password, username, avatarURL } = req.body;
  const response = await axios.post(
    DGRAPH_URL,
    {
      query: QUERY_USER,
      variables: {
        filter: { username: { eq: username } },
      },
    },
    {
      headers: {
        "X-Toccatech-Auth": generateAdminJwt(privateKey),
      },
    }
  );
  const rawUsers = response.data;
  const users = rawUsers.data.queryUserProfile;

  if (users.length > 0) {
    res.status(406).send({ error: "Sorry, this username is already taken by another user!" });
  } else {
    const hashedPassword = await hash(password, 10);
    const { data } = await axios.post(
      DGRAPH_URL,
      {
        query: ADD_USER,
        variables: {
          addUserInput: [{ email, password: hashedPassword, userProfile: { username, avatarURL } }],
        },
      },
      {
        headers: {
          "X-Toccatech-Auth": generateAdminJwt(privateKey),
        },
      }
    );
    if (data.errors) {
      res.status(500).send(data.errors);
    } else {
      const user = data.data.addUser.user[0];
      const userJwt = generateUserJwt(privateKey, user.id);
      res
        .cookie("X-Toccatech-Auth", "Bearer " + userJwt, { maxAge: 1000 * JWT_MAX_AGE })
        .status(201)
        .json({
          message: `User successfully created! A JWT was generated too! Welcome, ${username}!`,
          user: {
            id: user.id,
            userProfileId: user.userProfile.id,
            email: user.email,
            username: user.userProfile.username,
            avatarURL: user.userProfile.avatarURL,
            authToken: userJwt,
          },
        });
    }
  }
});

const signInBodySchema: ValidationSchema = {
  username: {
    type: "string",
    required: true,
    errorMessage: "The field 'username' is required!",
  },
  password: {
    type: "string",
    required: true,
    minLength: 6,
    errorMessage: "The field 'password' is required and must contain at least 6 characters!",
  },
};

router.post("/signin", validateBody(signInBodySchema), async (req, res) => {
  const { username, password } = req.body;
  const { data } = await axios.post(
    DGRAPH_URL,
    {
      query: QUERY_USER,
      variables: {
        filter: { username: { eq: username } },
      },
    },
    {
      headers: {
        "X-Toccatech-Auth": generateAdminJwt(privateKey),
      },
    }
  );
  const userProfiles = data.data.queryUserProfile;
  if (userProfiles.length == 0) {
    res.status(404).send({ error: "The provided username does not correspond to a known user!" });
  } else {
    const userAccount = userProfiles[0].userAccount;
    const userProfile = userProfiles[0];
    const validPassword = await compare(password, userAccount.password);
    if (!validPassword) {
      res.status(403).send({ error: "The password is invalid!" });
    } else {
      const userJwt = generateUserJwt(privateKey, userAccount.id);
      res
        .cookie("X-Toccatech-Auth", "Bearer " + userJwt, {
          maxAge: 1000 * JWT_MAX_AGE,
        })
        .status(200)
        .send({
          msg: `Welcome, ${username}!`,
          user: {
            id: userAccount.id,
            userProfileId: userProfile.id,
            email: userAccount.email,
            username: userProfile.username,
            avatarURL: userProfile.avatarURL,
            authToken: userJwt,
          },
        });
    }
  }
});

router.get("/signout", async (req, res) => {
  res.clearCookie("X-Toccatech-Auth").status(200).send({ msg: "You are now signed out!" });
});

export default router;
