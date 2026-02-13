import { createClient } from '@supabase/supabase-js';
import type { Revenue } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseConfigured = () => !!supabase;

/** Create a Supabase client from url + anon key (e.g. from runtime config API). */
export function createSupabaseClient(url: string, anonKey: string) {
  return url && anonKey ? createClient(url, anonKey) : null;
}

export type DbAppointment = {
  id: string;
  patient_name: string;
  phone: string;
  email: string;
  service: string;
  preferred_date: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  rejection_reason?: string | null;
  confirmed_date?: string | null;
  follow_up_notes?: string | null;
};

export type DbRevenue = {
  id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi';
  date: string;
  notes?: string | null;
  will_visit_back?: boolean | null;
  follow_up_notes?: string | null;
  source?: string | null;
};

export function mapAppointmentFromDb(row: DbAppointment) {
  return {
    id: row.id,
    patientName: row.patient_name,
    phone: row.phone,
    email: row.email,
    service: row.service,
    preferredDate: row.preferred_date,
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    confirmedDate: row.confirmed_date ?? undefined,
    followUpNotes: row.follow_up_notes ?? undefined,
  };
}

export function mapAppointmentToDb(appt: {
  patientName: string;
  phone: string;
  email: string;
  service: string;
  preferredDate: string;
  status?: string;
  rejectionReason?: string;
  confirmedDate?: string;
}) {
  return {
    patient_name: appt.patientName,
    phone: appt.phone,
    email: appt.email,
    service: appt.service,
    preferred_date: appt.preferredDate,
    status: appt.status ?? 'pending',
    rejection_reason: appt.rejectionReason ?? null,
    confirmed_date: appt.confirmedDate ?? null,
  };
}

export function mapRevenueFromDb(row: DbRevenue): Revenue {
  return {
    id: row.id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    date: row.date,
    notes: row.notes ?? undefined,
    willVisitBack: row.will_visit_back ?? false,
    followUpNotes: row.follow_up_notes ?? undefined,
    source: row.source === 'walk_in' || row.source === 'online' ? row.source : undefined,
  };
}

export function mapRevenueToDb(rev: { amount: number; paymentMethod: string; date: string; notes?: string; willVisitBack?: boolean; followUpNotes?: string; source?: string }) {
  return {
    amount: rev.amount,
    payment_method: rev.paymentMethod as 'cash' | 'card' | 'upi',
    date: rev.date,
    notes: rev.notes ?? null,
    will_visit_back: rev.willVisitBack ?? false,
    follow_up_notes: rev.followUpNotes ?? null,
    source: rev.source ?? null,
  };
}
