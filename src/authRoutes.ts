import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { validateBody, ValidationSchema, genAdminJwt, genUserJwt, JWT_MAX_AGE } from "./helpers";
import axios from "axios";

const router = Router();
const DGRAPH_URL = process.env.DB_URL || "https://dgraph.toccatech.com/graphql";
const FILE_SERVER_URL = process.env.FILE_SERVER_URL || "https://file-server.toccatech.com";
const AUTH_COOKIE = process.env.AUTH_COOKIE || "X-Toccatech-Auth";

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

const QUERY_USER_PROFILE = `
  query QueryUserProfile($filter: UserProfileFilter) {
    queryUserProfile(filter: $filter) {
      id
      username
      avatarURL
      pieces {
        id
        title
        scoreURL
        composer {
          id
          name
          avatarURL
        }
      }
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
    errorMessage: "Le champ 'email' est requis et doit être valide !",
  },
  password: {
    type: "string",
    required: true,
    minLength: 6,
    errorMessage: "Le champ 'password' est requis et doit contenir au moins 6 caractères !",
  },
  username: {
    type: "string",
    required: true,
    errorMessage: "Le champ 'username' est requis !",
  },
  avatarURL: {
    type: "string",
    regExp: new RegExp("^" + FILE_SERVER_URL + '/files/[^ "/]+$'),
    errorMessage:
      "Le champ 'avatarURL' est invalide ! L'URL doit nécessairement renvoyer à un fichier stocké sur le File Server !",
  },
};

router.post("/signup", validateBody(signUpBodySchema), async (req, res) => {
  const { email, password, username, avatarURL } = req.body;
  const response = await axios.post(
    DGRAPH_URL,
    {
      query: QUERY_USER_PROFILE,
      variables: { filter: { username: { eq: username } } },
    },
    { headers: { [AUTH_COOKIE]: genAdminJwt() } }
  );
  const rawUsers = response.data;
  const users = rawUsers.data.queryUserProfile;

  if (users.length > 0) {
    res.status(406).send({ error: "Désolé, ce nom d'utilisateur est déjà pris !" });
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
      { headers: { [AUTH_COOKIE]: genAdminJwt() } }
    );
    const user = data.data.addUser.user[0];
    const userJwt = genUserJwt(user.id);
    const host = req.get("Host");
    const domainParts = host!.split(".");
    const tld = domainParts.pop();
    const sld = domainParts.pop();
    const domain = [sld, tld].join(".");
    res
      .cookie(AUTH_COOKIE, "Bearer " + userJwt, { maxAge: 1000 * JWT_MAX_AGE, domain })
      .status(201)
      .send({
        msg: `Votre compte a bien été créé ! Bienvenue, ${username}!`,
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
});

const signInBodySchema: ValidationSchema = {
  username: {
    type: "string",
    required: true,
    errorMessage: "Le champ 'username' est requis !",
  },
  password: {
    type: "string",
    required: true,
    minLength: 6,
    errorMessage: "Le champ 'password' est requis et doit contenir au moins 6 caractères !",
  },
};

router.post("/signin", validateBody(signInBodySchema), async (req, res) => {
  const { username, password } = req.body;
  const { data } = await axios.post(
    DGRAPH_URL,
    { query: QUERY_USER_PROFILE, variables: { filter: { username: { eq: username } } } },
    { headers: { [AUTH_COOKIE]: genAdminJwt() } }
  );
  const userProfiles = data.data.queryUserProfile;
  if (userProfiles.length == 0) {
    res
      .status(404)
      .send({ error: "Le nom d'utilisateur envoyé n'est pas attaché à un compte existant !" });
  } else {
    const userAccount = userProfiles[0].userAccount;
    const userProfile = userProfiles[0];
    const validPassword = await compare(password, userAccount.password);
    if (!validPassword) {
      res.status(403).send({ error: "Navré, mais votre mot de passe est incorrect !" });
    } else {
      const userJwt = genUserJwt(userAccount.id);
      const host = req.get("Host");
      const domainParts = host!.split(".");
      const tld = domainParts.pop();
      const sld = domainParts.pop();
      const domain = [sld, tld].join(".");
      res
        .cookie(AUTH_COOKIE, "Bearer " + userJwt, { maxAge: 1000 * JWT_MAX_AGE, domain })
        .status(200)
        .send({
          msg: `Content de vous revoir, ${username}!`,
          user: {
            id: userAccount.id,
            userProfileId: userProfile.id,
            email: userAccount.email,
            username: userProfile.username,
            avatarURL: userProfile.avatarURL,
            pieces: userProfile.pieces,
            authToken: userJwt,
          },
        });
    }
  }
});

router.get("/signout", async (_req, res) => {
  res.clearCookie(AUTH_COOKIE).status(200).send({ msg: "Vous êtes à présent déconnecté !" });
});

export default router;
