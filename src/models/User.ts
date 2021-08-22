import { Schema, model, Document } from "mongoose";
import isEmail from "validator/lib/isEmail";

// Grâce au mot clef "interface", on définit les propriétés d'une variable ayant le type UserDocument
interface UserDocument extends Document {
  email: string;
  password: string;
}

const UserSchema = new Schema({
  email: {
    type: String,
    required: [true, "Please enter an email"],
    unique: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please enter a password"],
    minlength: [6, "Minimum password length is 6 characters"],
  },
});

// Le Ninja nomme cette variable "User"
const UserModel = model<UserDocument>("user", UserSchema);
export default UserModel;

// Exemple d'utilisation du modèle
// const myUser = new UserModel({ email: "pitchoun@toccatech.com", password: "test1234" });
// myUser.save();
