import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.middleware';
import {
  listTrips, getTrip, createTrip, deleteTrip,
  addActivity, updateActivity, deleteActivity,
  addDestination, updateDestination
} from '../controllers/trips.controller.js';

export const tripRoutes = Router();

// Todas las rutas de viajes requieren sesión
tripRoutes.use(authenticate);

tripRoutes.get('/', listTrips);
tripRoutes.get('/:id', getTrip);
tripRoutes.post('/', createTrip);
tripRoutes.delete('/:id', deleteTrip);
tripRoutes.post('/:id/days/:day/activities', addActivity);
tripRoutes.patch('/:id/activities/:activityId', updateActivity);
tripRoutes.delete('/:id/activities/:activityId', deleteActivity);
tripRoutes.post('/:id/destinations', addDestination);
tripRoutes.patch('/:id/destinations/:destinationId', updateDestination);