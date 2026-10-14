import { model, Schema, type InferSchemaType } from 'mongoose';

const CATEGORIES = ['Comida', 'Cultura', 'Transporte', 'Hospedaje', 'Aventura'] as const;

const activitySchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  time: { type: String, default: '09:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  category: { type: String, enum: CATEGORIES, required: true },
  cost: { type: Number, min: 0, default: 0 },
  isFavorite: { type: Boolean, default: false }
});

const destinationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  isFavorite: { type: Boolean, default: false }
});

const daySchema = new Schema(
  { activities: { type: [activitySchema], default: [] } },
  { _id: false }
);

const tripSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    categories: { type: [String], default: [] },
    durationDays: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
      default: 'USD'
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    budget: { type: Number, min: 0, default: 0 },
    gradient: { type: Number, min: 0, max: 3, default: 0 },
    destinations: { type: [destinationSchema], default: [] },
    days: { type: [daySchema], default: [] },

    // relajar: el formulario del front no los pide
    country: { type: String, trim: true, maxlength: 80, default: '' },   // quitar required
    price: { type: Number, min: 0, default: 0 },                         // quitar required
    imageUrl: { type: String, trim: true, default: '' },
    // Inactive trips stay in the database but are hidden from the catalog.
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

tripSchema.pre('validate', function () {
  this.durationDays = Math.max(1, this.days.length);
});

tripSchema.virtual('destination').get(function () {
  return [this.city, this.country].filter(Boolean).join(', ');
});
tripSchema.set('toJSON', { virtuals: true });

tripSchema.index({ user: 1, isActive: 1, createdAt: -1 });

// Indexes that match the sorts and filters used by the catalog.
tripSchema.index({ isActive: 1, name: 1 });
tripSchema.index({ isActive: 1, country: 1, name: 1 });
tripSchema.index({ isActive: 1, price: 1, name: 1 });

export type TripDocument = InferSchemaType<typeof tripSchema>;
export const Trip = model('Trip', tripSchema);