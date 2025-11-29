import mongoose, { Schema, model, models } from 'mongoose';

interface IUser {
  address: string;
  score: number;
  inventory: string[];
}

const UserSchema = new Schema<IUser>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    inventory: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<IUser>('User', UserSchema);

export default User;

