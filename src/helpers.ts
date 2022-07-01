import { Request, Response, NextFunction } from "express";
import { sign } from "jsonwebtoken";
import fs from "fs";

const privateKey = fs.readFileSync("./rsa_1024_priv.pem", "utf-8");
const JWT_ISS = process.env.JWT_ISS || "Toccatech Corporation";
const JWT_SUB = process.env.JWT_SUB || "Toccatech Users";
const JWT_AUD = process.env.JWT_AUD || "https://toccatech.com";
const JWT_CLAIMS = process.env.JWT_CLAIMS || "https://toccatech.com/jwt/claims";

export interface ValidationSchema {
  [key: string]: {
    type: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    regExp?: RegExp;
    in?: any[];
    errorMessage: string;
  };
}

export const validateBody = (validationSchema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let isValid = true;
    let errors: Record<string, string> = {};

    // Test if the body contains extra fields
    let schemaKeys = Object.keys(validationSchema);
    let bodyKeys = Object.keys(req.body);
    bodyKeys.forEach((bodyKey) => {
      if (!schemaKeys.includes(bodyKey)) {
        isValid = false;
        errors[bodyKey] = "This field is not accepted for this route!";
      }
    });

    for (let key in validationSchema) {
      let fieldValid = true;
      let rules = validationSchema[key];

      if (req.body[key] && rules.type !== typeof req.body[key]) fieldValid = false;
      if (rules.required && !req.body[key]) fieldValid = false;
      if (req.body[key]) {
        if (rules.minLength && req.body[key].length < rules.minLength) fieldValid = false;
        if (rules.maxLength && req.body[key].length > rules.maxLength) fieldValid = false;
        if (rules.regExp && !rules.regExp.test(req.body[key])) fieldValid = false;
        if (rules.in && !rules.in.includes(req.body[key])) fieldValid = false;
      }

      if (!fieldValid) {
        isValid = false;
        errors[key] = rules.errorMessage;
      }
    }

    if (!isValid) {
      res.status(400).send({ validationErrors: errors });
    } else next();
  };
};

export const capitalise = (str: string) => str[0].toUpperCase() + str.slice(1);

export const genAdminJwt = () => {
  return sign(
    {
      [JWT_CLAIMS]: {
        ROLE: "ADMIN",
      },
    },
    privateKey,
    {
      issuer: JWT_ISS,
      subject: JWT_SUB,
      audience: JWT_AUD,
      expiresIn: 60, // One minute
      algorithm: "RS256",
    }
  );
};

export const genUserJwt = (userId: string) => {
  return sign(
    {
      [JWT_CLAIMS]: {
        ROLE: "USER",
        USER: userId,
        isAuthenticated: "true",
      },
    },
    privateKey,
    {
      issuer: JWT_ISS,
      subject: JWT_SUB,
      audience: JWT_AUD,
      expiresIn: JWT_MAX_AGE,
      algorithm: "RS256",
    }
  );
};

export const JWT_MAX_AGE = 60 * 60 * 24 * 28; // Four weeks in seconds
