export interface Appointment {
  id: string;
  patientName: string;
  phone: string;
  email: string;
  service: string;
  preferredDate: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  rejectionReason?: string;
  confirmedDate?: string;
  followUpNotes?: string;
}

export interface Revenue {
  id: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  date: string;
  notes?: string;
  willVisitBack?: boolean;
  followUpNotes?: string;
  source?: 'walk_in' | 'online';
}
