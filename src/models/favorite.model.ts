import { model, Schema } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true }
  },
  { timestamps: true }
);

favoriteSchema.index({ userId: 1, tripId: 1 }, { unique: true });

export const Favorite = model('Favorite', favoriteSchema);
