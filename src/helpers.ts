import { Request, Response, NextFunction } from "express";
import { sign } from "jsonwebtoken";

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

export const generateAdminJwt = (privateKey: string) => {
  return sign(
    {
      "https://toccatech.com/jwt/claims": {
        ROLE: "ADMIN",
      },
    },
    privateKey,
    {
      issuer: "Toccatech Corporation",
      subject: "Toccatech Users",
      audience: "https://toccatech.com",
      expiresIn: 60, // One minute
      algorithm: "RS256",
    }
  );
};

export const generateUserJwt = (privateKey: string, userId: string) => {
  return sign(
    {
      "https://toccatech.com/jwt/claims": {
        ROLE: "USER",
        USER: userId,
        isAuthenticated: "true",
      },
    },
    privateKey,
    {
      issuer: "Toccatech Corporation",
      subject: "Toccatech Users",
      audience: "https://toccatech.com",
      expiresIn: JWT_MAX_AGE,
      algorithm: "RS256",
    }
  );
};

export const JWT_MAX_AGE = 60 * 60 * 24 * 28; // Four weeks in seconds
