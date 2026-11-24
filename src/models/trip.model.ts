import { model, Schema, type InferSchemaType } from 'mongoose';

export const CATEGORIES = ['Comida', 'Cultura', 'Transporte', 'Hospedaje', 'Aventura'] as const;
export const MIN_DAYS = 1;
export const MAX_DAYS = 14;

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

    country: { type: String, trim: true, maxlength: 80, default: '' },
    // Portada subida por el dueño: "/uploads/covers/<uuid>.<ext>" o '' si no tiene.
    coverUrl: { type: String, trim: true, default: '' },
    // Los viajes eliminados quedan en la base con isActive = false (borrado lógico).
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

// Presupuesto calculado en el backend a partir de days[].activities.
// Son virtuales: no se guardan en MongoDB, así que nunca quedan desfasados.
tripSchema.virtual('spent').get(function () {
  return this.days.reduce(
    (total, day) => total + day.activities.reduce((sum, activity) => sum + (activity.cost ?? 0), 0),
    0
  );
});

tripSchema.virtual('activityCount').get(function () {
  return this.days.reduce((total, day) => total + day.activities.length, 0);
});

tripSchema.set('toJSON', { virtuals: true });

tripSchema.index({ user: 1, isActive: 1, createdAt: -1 });

// Índices para los filtros y ordenamientos de GET /api/trips.
tripSchema.index({ isActive: 1, name: 1 });
tripSchema.index({ isActive: 1, country: 1, name: 1 });

export type TripDocument = InferSchemaType<typeof tripSchema>;
export const Trip = model('Trip', tripSchema);