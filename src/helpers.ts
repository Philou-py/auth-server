import { Request, Response, NextFunction } from "express";

// Handle errors
export const handleErrors = (err: any, res: Response) => {
  console.log("Message d'erreur :", err.message, "Code d'erreur :", err.code);
  let errors: Record<string, string> = {};

  // Duplicate error
  if (err.code === 11000) {
    errors.email = "That email is already registered";
    res.status(400).send({ validationErrors: errors });
    // Status codes explained on https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
  } else {
    // Validation errors
    if (err.message.includes("validation failed")) {
      Object.values(err.errors as object).forEach(({ properties }) => {
        errors[properties.path] = properties.message;
      });
      res.status(400).send({ validationErrors: errors });
    } else {
      res.status(500).send({ error: err });
    }
  }
};

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
      res.send({ validationErrors: errors });
    } else next();
  };
};
