import mongoose, { Schema, model, models } from 'mongoose';

interface ILoot {
  lat: number;
  lng: number;
  active: boolean;
  claimedBy?: string;
}

const LootSchema = new Schema<ILoot>(
  {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    claimedBy: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const Loot = models.Loot || model<ILoot>('Loot', LootSchema);

export default Loot;

