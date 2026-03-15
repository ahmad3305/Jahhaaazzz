import { z } from 'zod';

export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: any[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

// ============ PASSENGER SCHEMAS ============
export const passengerCreateSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  gender: z.enum(['male', 'female']),
  passport_number: z.string().min(1, 'Passport number is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  contact_number: z.string().min(1, 'Contact number is required'),
  email: z.string().email('Invalid email address'),
});

export const passengerUpdateSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  gender: z.enum(['male', 'female']).optional(),
  passport_number: z.string().min(1).optional(),
  nationality: z.string().min(1).optional(),
  date_of_birth: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email().optional(),
});

// ============ AIRLINE SCHEMAS ============
export const airlineCreateSchema = z.object({
  airline_name: z.string().min(1, 'Airline name is required'),
  country: z.string().min(1, 'Country is required'),
  airline_code: z.string().min(2).max(3),
});

export const airlineUpdateSchema = z.object({
  airline_name: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  airline_code: z.string().min(2).max(3).optional(),
});

// ============ AIRPORT SCHEMAS ============
export const airportCreateSchema = z.object({
  airport_name: z.string().min(1, 'Airport name is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  airport_code: z.string().length(3, 'Airport code must be 3 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
});

export const airportUpdateSchema = z.object({
  airport_name: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  airport_code: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

// ============ AIRCRAFT TYPE SCHEMAS ============
export const aircraftTypeCreateSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  seat_capacity: z.number().int().positive('Seat capacity must be positive'),
});

export const aircraftTypeUpdateSchema = z.object({
  model_name: z.string().min(1).optional(),
  manufacturer: z.string().min(1).optional(),
  seat_capacity: z.number().int().positive().optional(),
});

// ============ AIRCRAFT SCHEMAS ============
export const aircraftCreateSchema = z.object({
  airline_id: z.number().int().positive(),
  aircraft_type_id: z.number().int().positive(),
  registration_number: z.string().min(1, 'Registration number is required'),
  status: z.enum(['Active', 'Maintenance', 'Retired']).optional(),
  economy_seats: z.number().int().min(0),
  business_seats: z.number().int().min(0),
  first_class_seats: z.number().int().min(0),
  max_speed_kmh: z.number().positive().optional(),
  fuel_capacity_litres: z.number().positive().optional(),
  manufactered_date: z.string().optional(),
  current_airport: z.number().int().positive(),
});

export const aircraftUpdateSchema = z.object({
  airline_id: z.number().int().positive().optional(),
  aircraft_type_id: z.number().int().positive().optional(),
  registration_number: z.string().min(1).optional(),
  status: z.enum(['Active', 'Maintenance', 'Retired']).optional(),
  economy_seats: z.number().int().min(0).optional(),
  business_seats: z.number().int().min(0).optional(),
  first_class_seats: z.number().int().min(0).optional(),
  max_speed_kmh: z.number().positive().optional(),
  fuel_capacity_litres: z.number().positive().optional(),
  manufactered_date: z.string().optional(),
  latest_maintenance: z.string().optional(),
  next_maintenance_due: z.string().optional(),
  current_airport: z.number().int().positive().optional(),
});

// ============ FLIGHT SCHEMAS ============
export const flightCreateSchema = z.object({
  airline_id: z.number().int().positive('Airline ID is required'),
  flight_number: z.number().int().positive('Flight number is required'),
  source_airport_id: z.number().int().positive('Source airport is required'),
  destination_airport_id: z.number().int().positive('Destination airport is required'),
  flight_type: z.string().min(1, 'Flight type is required'),
  estimated_duration: z.union([z.string(), z.number()]).optional(),
});

export const flightUpdateSchema = z.object({
  airline_id: z.number().int().positive().optional(),
  flight_number: z.number().int().positive().optional(),
  source_airport_id: z.number().int().positive().optional(),
  destination_airport_id: z.number().int().positive().optional(),
  flight_type: z.string().min(1).optional(),
  estimated_duration: z.union([z.string(), z.number()]).optional(),
});

// ============ FLIGHT SCHEDULE SCHEMAS ============
export const flightScheduleCreateSchema = z.object({
  flight_id: z.number().int().positive('Flight ID is required'),
  aircraft_id: z.number().int().positive('Aircraft ID is required'),
  departure_datetime: z.string().min(1, 'Departure datetime is required'),
  arrival_datetime: z.string().min(1, 'Arrival datetime is required'),
  gate_id: z.number().int().positive().optional(),
  flight_status: z.enum(['Scheduled', 'Delayed', 'Boarding', 'Departed', 'Landed', 'Completed', 'Cancelled']).optional(),
});

export const flightScheduleUpdateSchema = z.object({
  flight_id: z.number().int().positive().optional(),
  aircraft_id: z.number().int().positive().optional(),
  departure_datetime: z.string().optional(),
  arrival_datetime: z.string().optional(),
  gate_id: z.number().int().positive().optional(),
  flight_status: z.enum(['Scheduled', 'Delayed', 'Boarding', 'Departed', 'Landed', 'Completed', 'Cancelled']).optional(),
});

// ============ TICKET SCHEMAS ============
export const ticketCreateSchema = z.object({
  passenger_id: z.number().int().positive('Passenger ID is required'),
  flight_schedule_id: z.number().int().positive('Flight schedule ID is required'),
  seat_class: z.enum(['Economy', 'Business', 'First']),
  seat_number: z.string().optional(),
  ticket_price: z.number().positive().optional(),
  status: z.enum(['Confirmed', 'Checked-In', 'Boarded', 'Cancelled', 'Moved']).optional(),
});

export const ticketUpdateSchema = z.object({
  seat_number: z.string().optional(),
  seat_class: z.enum(['Economy', 'Business', 'First']).optional(),
  ticket_price: z.number().positive().optional(),
  status: z.enum(['Confirmed', 'Checked-In', 'Boarded', 'Cancelled', 'Moved']).optional(),
});

// ============ BAGGAGE SCHEMAS ============
export const baggageCreateSchema = z.object({
  ticket_id: z.number().int().positive('Ticket ID is required'),
  flight_schedule_id: z.number().int().positive('Flight schedule ID is required'),
  weight_kg: z.number().positive('Weight must be positive'),
  baggage_type: z.enum(['Checked', 'Carry-on', 'Cargo']),
  status: z.enum(['Checked-In', 'Loaded', 'In Transit', 'Unloaded', 'Lost']).optional(),
});

export const baggageUpdateSchema = z.object({
  weight_kg: z.number().positive().optional(),
  baggage_type: z.enum(['Checked', 'Carry-on', 'Cargo']).optional(),
  status: z.enum(['Checked-In', 'Loaded', 'In Transit', 'Unloaded', 'Lost']).optional(),
});

// ============ BOARDING RECORD SCHEMAS ============
export const boardingRecordCreateSchema = z.object({
  ticket_id: z.number().int().positive('Ticket ID is required'),
  flight_schedule_id: z.number().int().positive('Flight schedule ID is required'),
  gate_id: z.number().int().positive('Gate ID is required'),
  boarding_time: z.string().optional(),
  boarding_status: z.enum(['Pending', 'Boarded', 'Denied']).optional(),
});

export const boardingRecordUpdateSchema = z.object({
  gate_id: z.number().int().positive().optional(),
  boarding_time: z.string().optional(),
  boarding_status: z.enum(['Pending', 'Boarded', 'Denied']).optional(),
});

// ============ CARGO SCHEMAS ============
export const cargoCreateSchema = z.object({
  flight_id: z.number().int().positive('Flight ID is required'),
  tracking_number: z.string().min(1, 'Tracking number is required'),
  cargo_type: z.enum(['General', 'Perishable', 'Hazardous', 'Fragile', 'Live Animals', 'Mail']),
  description: z.string().optional(),
  weight_kg: z.number().positive('Weight must be positive'),
  origin_airport_id: z.number().int().positive('Origin airport is required'),
  destination_airport_id: z.number().int().positive('Destination airport is required'),
  sender_name: z.string().min(1, 'Sender name is required'),
  sender_contact: z.string().min(1, 'Sender contact is required'),
  reciever_name: z.string().min(1, 'Receiver name is required'),
  reciever_contact: z.string().min(1, 'Receiver contact is required'),
  is_insured: z.boolean().optional(),
});

export const cargoUpdateSchema = z.object({
  flight_id: z.number().int().positive().optional(),
  tracking_number: z.string().min(1).optional(),
  cargo_type: z.enum(['General', 'Perishable', 'Hazardous', 'Fragile', 'Live Animals', 'Mail']).optional(),
  description: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  origin_airport_id: z.number().int().positive().optional(),
  destination_airport_id: z.number().int().positive().optional(),
  sender_name: z.string().min(1).optional(),
  sender_contact: z.string().min(1).optional(),
  reciever_name: z.string().min(1).optional(),
  reciever_contact: z.string().min(1).optional(),
  status: z.enum(['Booked', 'Loaded', 'In Transit', 'Unloaded', 'Customs Hold', 'Delivered', 'Cancelled']).optional(),
  is_insured: z.boolean().optional(),
});

// ============ PAYMENT SCHEMAS ============
export const paymentCreateSchema = z.object({
  ticket_id: z.number().int().positive().optional(),
  cargo_id: z.number().int().positive().optional(),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['Credit Card', 'Cash', 'Online Transfer']),
});

export const paymentUpdateSchema = z.object({
  amount: z.number().positive().optional(),
  payment_method: z.enum(['Credit Card', 'Cash', 'Online Transfer']).optional(),
  payment_status: z.enum(['Pending', 'Completed', 'Failed']).optional(),
});

// ============ STAFF SCHEMAS ============
export const staffCreateSchema = z.object({
  airport_id: z.number().int().positive('Airport ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['Pilot', 'Co-Pilot', 'Cabin Crew', 'Check-in Staff', 'Boarding Staff', 'Baggage Handler', 'Ramp Operator', 'Maintenance Crew', 'Supervisor']),
  staff_type: z.enum(['Flight Crew', 'Ground Staff']),
  hire_date: z.string().optional(),
  license_number: z.string().optional(),
  status: z.enum(['Active', 'On Leave', 'Inactive']).optional(),
});

export const staffUpdateSchema = z.object({
  airport_id: z.number().int().positive().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  role: z.enum(['Pilot', 'Co-Pilot', 'Cabin Crew', 'Check-in Staff', 'Boarding Staff', 'Baggage Handler', 'Ramp Operator', 'Maintenance Crew', 'Supervisor']).optional(),
  staff_type: z.enum(['Flight Crew', 'Ground Staff']).optional(),
  hire_date: z.string().optional(),
  license_number: z.string().optional(),
  status: z.enum(['Active', 'On Leave', 'Inactive']).optional(),
});

// ============ SHIFT SCHEMAS ============
export const shiftCreateSchema = z.object({
  staff_id: z.number().int().positive('Staff ID is required'),
  shift_date: z.string().min(1, 'Shift date is required'),
  shift_start: z.string().min(1, 'Shift start time is required'),
  shift_end: z.string().min(1, 'Shift end time is required'),
  availability_status: z.enum(['Available', 'Assigned', 'Off']).optional(),
});

export const shiftUpdateSchema = z.object({
  staff_id: z.number().int().positive().optional(),
  shift_date: z.string().optional(),
  shift_start: z.string().optional(),
  shift_end: z.string().optional(),
  availability_status: z.enum(['Available', 'Assigned', 'Off']).optional(),
});

// ============ TASK SCHEMAS ============
export const taskCreateSchema = z.object({
  flight_schedule_id: z.number().int().positive('Flight schedule ID is required'),
  task_type: z.enum(['Pilot Operation', 'Cabin Preparation', 'Boarding', 'Baggage Loading', 'Baggage Unloading', 'Aircraft Cleaning', 'Technical Check']),
  required_role: z.string().min(1, 'Required role is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  task_status: z.enum(['Pending', 'Assigned', 'In Progress', 'Completed']).optional(),
});

export const taskUpdateSchema = z.object({
  flight_schedule_id: z.number().int().positive().optional(),
  task_type: z.enum(['Pilot Operation', 'Cabin Preparation', 'Boarding', 'Baggage Loading', 'Baggage Unloading', 'Aircraft Cleaning', 'Technical Check']).optional(),
  required_role: z.string().min(1).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  task_status: z.enum(['Pending', 'Assigned', 'In Progress', 'Completed']).optional(),
});

// ============ TASK ASSIGNMENT SCHEMAS ============
export const taskAssignmentCreateSchema = z.object({
  task_id: z.number().int().positive('Task ID is required'),
  staff_id: z.number().int().positive('Staff ID is required'),
  assignment_status: z.enum(['Assigned', 'Completed', 'Cancelled']).optional(),
  end_time: z.string().optional(),
});

export const taskAssignmentUpdateSchema = z.object({
  assignment_status: z.enum(['Assigned', 'Completed', 'Cancelled']).optional(),
  end_time: z.string().optional(),
});

// ============ CREW REQUIREMENT SCHEMAS ============
export const crewRequirementCreateSchema = z.object({
  flight_schedule_id: z.number().int().positive(),
  role_required: z.string().min(1),
  number_required: z.number().int().positive(),
});

export const crewRequirementUpdateSchema = z.object({
  role_required: z.string().min(1).optional(),
  number_required: z.number().int().positive().optional(),
});

// ============ FLIGHT INCIDENT SCHEMAS ============
export const flightIncidentCreateSchema = z.object({
  flight_schedule_id: z.number().int().positive(),
  incident_type: z.string().min(1),
  description: z.string().min(1),
  incident_datetime: z.string().optional(),
  severity: z.string().optional(),
  resolution: z.string().optional(),
  flight_status: z.string().optional(),
});

export const flightIncidentUpdateSchema = z.object({
  incident_type: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  incident_datetime: z.string().optional(),
  severity: z.string().optional(),
  resolution: z.string().optional(),
  resolved_at: z.string().optional(),
  flight_status: z.string().optional(),
});

// ============ FLIGHT CONSOLIDATION SCHEMAS ============
export const flightConsolidationCreateSchema = z.object({
  original_flight_schedule_id: z.number().int().positive(),
  target_flight_schedule_id: z.number().int().positive(),
  reason: z.string().optional(),
  consolidation_date: z.string().optional(),
});

export const flightConsolidationUpdateSchema = z.object({
  reason: z.string().optional(),
  consolidation_date: z.string().optional(),
  status: z.string().optional(),
});
