import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, Clock, 
  CheckCircle, Plus, ChevronLeft, ChevronRight, Smile, Calendar, User, Stethoscope
} from 'lucide-react';
import { format, addMonths, subMonths, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import {
  supabase as supabaseFromEnv,
  createSupabaseClient,
  mapAppointmentFromDb,
  mapAppointmentToDb,
  mapRevenueFromDb,
  mapRevenueToDb,
} from './lib/supabase';
import type { Appointment, Revenue } from './types';
import { serviceList, serviceImages, serviceColors, ADMIN_EMAIL, ADMIN_PASSWORD } from './constants';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';

function App() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  const [bookService, setBookService] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00');
  const [bookMonth, setBookMonth] = useState(new Date());
  const [bookVisitType, setBookVisitType] = useState<'first' | 'followup' | 'consultation'>('consultation');
  const [scheduleCollapsed, setScheduleCollapsed] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createSupabaseClient>>(null);

  const navigate = useNavigate();
  const useSupabase = !!supabaseClient;

  // In production, load Supabase config from API (env at runtime). In dev, use build-time env.
  // Only use anon key if it looks like a JWT (eyJ...) - publishable key (sb_publishable_...) causes 401 with PostgREST.
  useEffect(() => {
    if (import.meta.env.PROD) {
      fetch('/api/config')
        .then((r) => r.json())
        .then(({ url, anonKey }: { url?: string; anonKey?: string }) => {
          const isJwt = typeof anonKey === 'string' && anonKey.startsWith('eyJ');
          if (url && anonKey && isJwt) {
            setSupabaseClient(createSupabaseClient(url, anonKey));
          } else if (url && anonKey && !isJwt) {
            console.warn(
              '[Supabase] anon key is not a JWT (expected to start with eyJ). Use Legacy anon key from Supabase: Project Settings → API → Legacy API Keys.'
            );
          }
        })
        .catch(() => {});
    } else {
      setSupabaseClient(supabaseFromEnv);
    }
  }, []);

  // Auth state from Supabase
  useEffect(() => {
    if (!supabaseClient) return;
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  // Load data: Supabase (when authenticated) or localStorage
  const fetchData = async () => {
    if (!supabaseClient) return;
    setDataError(null);
    try {
      const { data: apptRows, error: apptErr } = await supabaseClient.from('appointments').select('*').order('preferred_date', { ascending: false });
      const { data: revRows, error: revErr } = await supabaseClient.from('revenue').select('*').order('date', { ascending: false });
      if (apptErr || revErr) {
        setDataError(apptErr?.message || revErr?.message || 'Failed to load data');
        return;
      }
      if (apptRows) setAppointments(apptRows.map(mapAppointmentFromDb));
      if (revRows) setRevenues(revRows.map(mapRevenueFromDb));
      setDataReady(true);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : 'Failed to load data');
    }
  };

  useEffect(() => {
    if (useSupabase && supabaseClient) {
      if (!isAuthenticated) {
        setAppointments([]);
        setRevenues([]);
        setDataError(null);
        setDataReady(true);
        return;
      }
      fetchData();
    } else {
      const savedAppts = localStorage.getItem('appointments');
      if (savedAppts) {
        setAppointments(JSON.parse(savedAppts));
      } else {
        const initialAppts: Appointment[] = [
          { id: 'appt1', patientName: "Aarav Sharma", phone: "9845678901", email: "aarav.sharma@email.com", service: "Root Canal", preferredDate: "2025-04-18T10:00:00", status: "pending" },
          { id: 'appt2', patientName: "Meera Patel", phone: "9987654321", email: "meera.p@email.com", service: "Braces", preferredDate: "2025-04-19T11:30:00", status: "pending" },
          { id: 'appt3', patientName: "Vikram Reddy", phone: "7012345678", email: "vikram.r@email.com", service: "Teeth Whitening", preferredDate: "2025-04-20T09:00:00", status: "confirmed", confirmedDate: "2025-04-20T09:00:00" },
          { id: 'appt4', patientName: "Ananya Khan", phone: "9123456789", email: "ananya.k@email.com", service: "Dentures", preferredDate: "2025-04-22T14:00:00", status: "confirmed", confirmedDate: "2025-04-22T14:00:00" },
          { id: 'appt5', patientName: "Rohan Malhotra", phone: "9876543210", email: "rohan.m@email.com", service: "Implants", preferredDate: "2025-04-23T16:00:00", status: "pending" },
        ];
        setAppointments(initialAppts);
        localStorage.setItem('appointments', JSON.stringify(initialAppts));
      }
      const savedRevs = localStorage.getItem('revenues');
      if (savedRevs) setRevenues(JSON.parse(savedRevs));
      else {
        const initialRevs: Revenue[] = [
          { id: 'rev1', amount: 5500, paymentMethod: 'upi', date: '2025-04-12', notes: 'Root Canal - Mrs. Kapoor' },
          { id: 'rev2', amount: 1500, paymentMethod: 'cash', date: '2025-04-13', notes: 'Cleaning - Mr. Singh' },
          { id: 'rev3', amount: 12500, paymentMethod: 'card', date: '2025-04-14', notes: 'Crowns - Family' },
        ];
        setRevenues(initialRevs);
        localStorage.setItem('revenues', JSON.stringify(initialRevs));
      }
      setDataReady(true);
    }
  }, [useSupabase, isAuthenticated, supabaseClient]);

  // Save to localStorage only when not using Supabase
  useEffect(() => {
    if (!useSupabase && dataReady) localStorage.setItem('appointments', JSON.stringify(appointments));
  }, [appointments, useSupabase, dataReady]);

  useEffect(() => {
    if (!useSupabase && dataReady) localStorage.setItem('revenues', JSON.stringify(revenues));
  }, [revenues, useSupabase, dataReady]);

  const login = async (email: string, password: string) => {
    if (useSupabase && supabaseClient) {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message || 'Invalid credentials');
        return;
      }
      toast.success('Welcome back, Dr. Insha');
      navigate('/dashboard');
    } else {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem('token', 'demo-jwt-token');
        setIsAuthenticated(true);
        toast.success('Welcome back, Dr. Insha');
        navigate('/dashboard');
      } else {
        toast.error('Invalid credentials. Use admin@goldengrove.com / lounge2024');
      }
    }
  };

  const logout = async () => {
    if (useSupabase && supabaseClient) await supabaseClient.auth.signOut();
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    navigate('/');
    toast.success('Logged out successfully');
  };

  const addAppointment = async (appt: Omit<Appointment, 'id' | 'status'>) => {
    if (useSupabase && supabaseClient) {
      const row = mapAppointmentToDb({ ...appt, status: 'pending' });
      const { data, error } = await supabaseClient.from('appointments').insert(row).select('id, patient_name, phone, email, service, preferred_date, status, rejection_reason, confirmed_date').single();
      if (error) {
        const is401 =
          (error as { status?: number }).status === 401 ||
          (error as { code?: string }).code === 'PGRST301' ||
          /401|unauthorized/i.test(error.message || '');
        if (is401) {
          toast.error(
            'Booking failed (401): Set VITE_SUPABASE_ANON_KEY in Vercel (Project → Settings → Environment Variables), then redeploy so the new build uses it.'
          );
        } else {
          toast.error(error.message || 'Failed to book appointment');
        }
        return;
      }
      setAppointments(prev => [mapAppointmentFromDb(data), ...prev]);
    } else {
      const newAppt: Appointment = { ...appt, id: crypto.randomUUID(), status: 'pending' };
      setAppointments(prev => [newAppt, ...prev]);
    }
    toast.success("Request received. We'll call you within 3 hours to confirm.");
  };

  const approveAppointment = async (id: string, assignedDateStr: string) => {
    const appt = appointments.find(a => a.id === id);
    const timePart = appt?.preferredDate?.includes('T') ? appt.preferredDate.slice(11, 19) : '10:00:00';
    const confirmedDate = `${assignedDateStr}T${timePart}`;
    if (useSupabase && supabaseClient) {
      const { error } = await supabaseClient.from('appointments').update({ status: 'confirmed', confirmed_date: confirmedDate }).eq('id', id);
      if (error) {
        toast.error(error.message || 'Failed to confirm');
        return;
      }
    }
    setAppointments(prev =>
      prev.map(a =>
        a.id === id ? { ...a, status: 'confirmed' as const, confirmedDate } : a
      )
    );
    toast.success(`Appointment confirmed for ${format(parseISO(assignedDateStr), 'EEE, dd MMM')}. Record payment after their visit.`);
  };

  const recordPaymentAndComplete = async (id: string, amount: number, method: 'cash' | 'card' | 'upi', willVisitBack: boolean, followUpNotes?: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    const revenueDate = format(new Date(), 'yyyy-MM-dd');
    const visitLabel = appt.followUpNotes ? ' (return visit)' : '';
    const newRevenuePayload = { amount, paymentMethod: method, date: revenueDate, notes: `${appt.service} - ${appt.patientName}${visitLabel}`, source: 'online' as const };
    const newStatus = willVisitBack ? 'confirmed' : 'completed';
    if (useSupabase && supabaseClient) {
      const { data: revRow, error: revErr } = await supabaseClient.from('revenue').insert(mapRevenueToDb(newRevenuePayload)).select('id, amount, payment_method, date, notes, source').single();
      const { error: apptErr } = await supabaseClient.from('appointments').update({ status: newStatus, follow_up_notes: willVisitBack ? (followUpNotes || null) : null }).eq('id', id);
      if (revErr || apptErr) {
        toast.error(revErr?.message || apptErr?.message || 'Failed to record');
        return;
      }
      if (revRow) setRevenues(prev => [mapRevenueFromDb(revRow), ...prev]);
    } else {
      setRevenues(prev => [{ ...newRevenuePayload, id: crypto.randomUUID() }, ...prev]);
    }
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: newStatus as 'confirmed' | 'completed', followUpNotes: willVisitBack ? (followUpNotes ?? undefined) : undefined } : a))
    );
    if (willVisitBack) toast.success(`Payment of ₹${amount} saved. Record kept open — open same record when they visit back.`);
    else toast.success(`Payment of ₹${amount} recorded. Visit marked completed.`);
  };

  const confirmOfflineReturnPayment = async () => {
    if (!revForReturnPayment || offlineReturnAmount <= 0) {
      toast.error('Please enter amount');
      return;
    }
    const newNotes = `${revForReturnPayment.notes ?? ''} (return visit)`;
    const willVisitBack = offlineReturnOutcome === 'will_visit_back';
    const newPayload = {
      amount: offlineReturnAmount,
      paymentMethod: offlineReturnMethod,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: newNotes,
      willVisitBack,
      followUpNotes: willVisitBack ? offlineReturnFollowUpNote : undefined,
      source: 'walk_in' as const,
    };
    if (useSupabase && supabaseClient) {
      const { data: newRow, error: insertErr } = await supabaseClient.from('revenue').insert(mapRevenueToDb(newPayload)).select('id, amount, payment_method, date, notes, will_visit_back, follow_up_notes, source').single();
      if (insertErr) {
        toast.error(insertErr.message || 'Failed to add return payment');
        return;
      }
      const { error: updateErr } = await supabaseClient.from('revenue').update({ will_visit_back: false }).eq('id', revForReturnPayment.id);
      if (updateErr) {
        toast.error(updateErr.message || 'Failed to update record');
        return;
      }
      if (newRow) setRevenues(prev => [mapRevenueFromDb(newRow), ...prev.map(r => r.id === revForReturnPayment.id ? { ...r, willVisitBack: false } : r)]);
    } else {
      const newId = crypto.randomUUID();
      setRevenues(prev => [{ ...newPayload, id: newId }, ...prev.map(r => r.id === revForReturnPayment.id ? { ...r, willVisitBack: false } : r)]);
    }
    setRevForReturnPayment(null);
    toast.success(willVisitBack ? 'Return payment saved. Record kept open for next visit.' : 'Return payment saved. Record closed.');
  };

  const updateVisitDate = async (id: string, newDateStr: string) => {
    const appt = appointments.find(a => a.id === id);
    const timePart = appt?.confirmedDate?.includes('T') ? appt.confirmedDate.slice(11, 19) : appt?.preferredDate?.includes('T') ? appt.preferredDate.slice(11, 19) : '10:00:00';
    const newConfirmedDate = `${newDateStr}T${timePart}`;
    if (useSupabase && supabaseClient) {
      const { error } = await supabaseClient.from('appointments').update({ confirmed_date: newConfirmedDate }).eq('id', id);
      if (error) {
        toast.error(error.message || 'Failed to update date');
        return;
      }
    }
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, confirmedDate: newConfirmedDate } : a))
    );
    setShowRescheduleInline(false);
    setShowApptModal(false);
    toast.success(`Visit date updated to ${format(parseISO(newDateStr), 'EEE, dd MMM')}.`);
  };

  const rejectAppointment = async (id: string, reason: string) => {
    if (useSupabase && supabaseClient) {
      const { error } = await supabaseClient.from('appointments').update({ status: 'rejected', rejection_reason: reason }).eq('id', id);
      if (error) {
        toast.error(error.message || 'Failed to reject');
        return;
      }
    }
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'rejected' as const, rejectionReason: reason } : a))
    );
    toast.error('Appointment rejected. Notification sent to patient.');
  };


  // Stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed');
  const todayAppts = confirmedAppointments.filter(
    a => a.confirmedDate && a.confirmedDate.startsWith(todayStr)
  ).length;
  const todayApptList = confirmedAppointments.filter(
    a => a.confirmedDate && a.confirmedDate.startsWith(todayStr)
  );
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowApptList = confirmedAppointments.filter(
    a => a.confirmedDate && a.confirmedDate.startsWith(tomorrowStr)
  );
  const upcomingAppointmentsByDay = (() => {
    const map = new Map<string, Appointment[]>();
    confirmedAppointments.forEach(a => {
      if (!a.confirmedDate) return;
      const d = a.confirmedDate.slice(0, 10);
      if (d === todayStr || d === tomorrowStr) return;
      const date = parseISO(d);
      if (date < new Date()) return;
      const key = format(date, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 7);
  })();

  const returnVisitAppointments = appointments.filter(a => a.status === 'confirmed' && a.followUpNotes);
  const offlineReturnRevenues = revenues.filter(r => r.willVisitBack);

  const todayRevenue = revenues
    .filter(r => r.date === todayStr)
    .reduce((sum, r) => sum + r.amount, 0);

  // This week revenue
  const now = new Date();
  const weekRevenues = revenues.filter(r => {
    const rDate = parseISO(r.date);
    const diff = (now.getTime() - rDate.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 6;
  });
  const weekTotal = weekRevenues.reduce((sum, r) => sum + r.amount, 0);

  const currentYearMonth = format(now, 'yyyy-MM');
  const monthRevenues = revenues.filter(r => r.date.startsWith(currentYearMonth));
  const monthTotal = monthRevenues.reduce((sum, r) => sum + r.amount, 0);

  const servicePopularityData = (() => {
    const counts: Record<string, number> = {};
    appointments.forEach(a => {
      if (a.status === 'rejected') return;
      counts[a.service] = (counts[a.service] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  })();

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDayAppts, setSelectedDayAppts] = useState<Appointment[]>([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showApptModal, setShowApptModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOffset = monthStart.getDay();
  const totalCells = Math.ceil((daysInMonth.length + firstDayOffset) / 7) * 7;

  const calendarDays = Array.from({ length: totalCells }, (_, i) => {
    const dayIndex = i - firstDayOffset;
    return dayIndex >= 0 && dayIndex < daysInMonth.length ? daysInMonth[dayIndex] : null;
  });

  const getDayAppointments = (day: Date) => {
    return appointments.filter(appt => {
      if (!appt.preferredDate) return false;
      const apptDate = parseISO(appt.preferredDate);
      return isSameDay(apptDate, day);
    });
  };

  const handleDayClick = (day: Date) => {
    const dayAppts = getDayAppointments(day);
    if (dayAppts.length > 0) {
      setSelectedDayAppts(dayAppts);
      setShowDayModal(true);
    } else {
      toast('No appointments scheduled for this day');
    }
  };

  const handleApptClick = (appt: Appointment) => {
    setSelectedAppt(appt);
    setShowApptModal(true);
    setShowDayModal(false);
  };

  // Revenue calculations for charts
  const paymentData = [
    { name: 'Cash', value: revenues.filter(r => r.paymentMethod === 'cash').length, color: '#FF6B35' },
    { name: 'Card', value: revenues.filter(r => r.paymentMethod === 'card').length, color: '#1E40AF' },
    { name: 'UPI', value: revenues.filter(r => r.paymentMethod === 'upi').length, color: '#D4AF37' },
  ].filter(d => d.value > 0);

  // Weekly bar data
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return format(d, 'EEE');
  });

  const weeklyData = weekDays.map((dayName, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    const dayStr = format(d, 'yyyy-MM-dd');
    const dayRev = revenues
      .filter(r => r.date === dayStr)
      .reduce((sum, r) => sum + r.amount, 0);
    return { day: dayName, amount: dayRev };
  });

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [pendingApptId, setPendingApptId] = useState<string | null>(null);
  const [apptForPayment, setApptForPayment] = useState<Appointment | null>(null);
  const [recordAmount, setRecordAmount] = useState(0);
  const [recordMethod, setRecordMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [visitOutcome, setVisitOutcome] = useState<'completed' | 'will_visit_back'>('completed');
  const [followUpDays, setFollowUpDays] = useState<string>('7');
  const [followUpCustomDays, setFollowUpCustomDays] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [revenueSort, setRevenueSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [revenueDateFrom, setRevenueDateFrom] = useState(() => format(subDays(new Date(), 4), 'yyyy-MM-dd'));
  const [revenueDateTo, setRevenueDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [approveAssignedDate, setApproveAssignedDate] = useState('');
  const [showRescheduleInline, setShowRescheduleInline] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [revForReturnPayment, setRevForReturnPayment] = useState<Revenue | null>(null);
  const [offlineReturnAmount, setOfflineReturnAmount] = useState(0);
  const [offlineReturnMethod, setOfflineReturnMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [offlineReturnOutcome, setOfflineReturnOutcome] = useState<'completed' | 'will_visit_back'>('completed');
  const [offlineReturnFollowUpNote, setOfflineReturnFollowUpNote] = useState('');
  const [revenueSearch, setRevenueSearch] = useState('');
  const [offlineFormOutcome, setOfflineFormOutcome] = useState<'completed' | 'will_visit_back'>('completed');
  const [offlineFormFollowUpNote, setOfflineFormFollowUpNote] = useState('');

  const openApprove = (id: string) => {
    const appt = appointments.find(a => a.id === id);
    const preferredDateStr = appt?.preferredDate?.slice(0, 10) || format(new Date(), 'yyyy-MM-dd');
    setPendingApptId(id);
    setApproveAssignedDate(preferredDateStr);
    setShowApproveModal(true);
  };

  const confirmApprove = () => {
    if (pendingApptId && approveAssignedDate) {
      approveAppointment(pendingApptId, approveAssignedDate);
      setShowApproveModal(false);
      setPendingApptId(null);
    }
  };

  const openRecordPayment = (appt: Appointment) => {
    setApptForPayment(appt);
    setRecordAmount(0);
    setRecordMethod('upi');
    setVisitOutcome('completed');
    setFollowUpDays('7');
    setFollowUpCustomDays('');
    setFollowUpNote('');
    setShowApptModal(false);
    setShowRecordPaymentModal(true);
  };

  const confirmRecordPayment = () => {
    if (apptForPayment && recordAmount > 0) {
      const willVisitBack = visitOutcome === 'will_visit_back';
      let followUpNotes: string | undefined;
      if (willVisitBack) {
        const days = followUpDays === 'custom' ? followUpCustomDays.trim() : followUpDays;
        const daysText = days ? `Come again after ${days} day${days === '1' ? '' : 's'}.` : '';
        followUpNotes = [daysText, followUpNote.trim()].filter(Boolean).join(' ');
      }
      recordPaymentAndComplete(apptForPayment.id, recordAmount, recordMethod, willVisitBack, followUpNotes);
      setShowRecordPaymentModal(false);
      setApptForPayment(null);
    } else {
      toast.error('Please enter amount');
    }
  };

  const filteredRevenues = (() => {
    let list = [...revenues];
    if (revenueDateFrom) list = list.filter(r => r.date >= revenueDateFrom);
    if (revenueDateTo) list = list.filter(r => r.date <= revenueDateTo);
    const search = revenueSearch.trim().toLowerCase();
    if (search) list = list.filter(r => (r.notes ?? '').toLowerCase().includes(search));
    if (revenueSort === 'newest') list.sort((a, b) => b.date.localeCompare(a.date));
    else if (revenueSort === 'highest') list.sort((a, b) => b.amount - a.amount);
    else if (revenueSort === 'lowest') list.sort((a, b) => a.amount - b.amount);
    return list;
  })();

  const openReject = (id: string) => {
    setPendingApptId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (pendingApptId && rejectReason.trim()) {
      rejectAppointment(pendingApptId, rejectReason);
      setShowRejectModal(false);
      setPendingApptId(null);
    } else {
      toast.error('Please provide a reason for rejection');
    }
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 font-light dark:bg-[#0A0E13] dark:text-[#F8F6F3]">
      <Nav
        isDark={isDark}
        setIsDark={setIsDark}
        isAuthenticated={isAuthenticated}
        logout={logout}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="pt-16 sm:pt-20 dark:bg-[#0A0E13] transition-colors duration-300 relative min-h-[60vh]">
        {/* Loading overlay when fetching data (Supabase + authenticated) */}
        {useSupabase && isAuthenticated && !dataReady && !dataError && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-50/90 dark:bg-[#0A0E13]/95 pt-16 sm:pt-20" aria-live="polite" aria-busy="true">
            <div className="flex flex-col items-center gap-6">
              <div className="h-12 w-12 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
              <p className="text-zinc-600 dark:text-[#A8B3BF] text-sm">Loading your data…</p>
            </div>
          </div>
        )}
        {/* Error overlay with retry */}
        {useSupabase && isAuthenticated && dataError && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-50/95 dark:bg-[#0A0E13]/98 pt-16 sm:pt-20 p-4" aria-live="assertive">
            <div className="text-center max-w-md">
              <p className="text-zinc-800 dark:text-[#F8F6F3] font-medium mb-1">Couldn’t load data</p>
              <p className="text-zinc-600 dark:text-[#A8B3BF] text-sm mb-6">{dataError}</p>
              <button type="button" onClick={() => { setDataReady(false); fetchData(); }} className="min-h-[44px] min-w-[44px] px-6 py-3 rounded-2xl bg-[#FF6B35] hover:bg-[#E55A1A] text-white text-sm font-medium transition-colors">
                Retry
              </button>
            </div>
          </div>
        )}
        <Routes>
          {/* Home */}
          <Route path="/" element={
            <div>
              {/* Hero - compact on mobile to reduce scroll */}
              <div className="relative min-h-[75dvh] sm:min-h-[100dvh] flex items-center justify-center overflow-hidden bg-zinc-950 py-12 sm:py-0">
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff10_1px,transparent_1px)] bg-[length:4px_4px]"></div>
                <img 
                  src="/images/hero.jpg" 
                  alt="Clinic Interior" 
                  className="absolute inset-0 w-full h-full object-cover opacity-70" 
                />
                
                <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl">
                  <div className="inline-block mb-3 sm:mb-6 px-4 sm:px-5 py-1 rounded-full border border-white/40 text-white text-[10px] sm:text-xs tracking-[4px]">HYDERABAD</div>
                  
                  <h1 className="text-white text-4xl sm:text-7xl md:text-[92px] leading-none font-semibold tracking-tight sm:tracking-[-5.5px] mb-3 sm:mb-6">GOLDEN GROVE</h1>
                  <p className="text-white/90 text-xl sm:text-3xl tracking-tight mb-4 sm:mb-10">DENTAL LOUNGE</p>
                  
                  <p className="max-w-md mx-auto text-sm sm:text-xl text-white/80 mb-5 sm:mb-12 px-1">A modern sanctuary for exceptional dental care led by Dr. Insha Farheen</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 justify-center">
                    <Link 
                      to="/book" 
                      className="group inline-flex items-center justify-center bg-white hover:bg-zinc-100 text-zinc-950 font-medium px-6 sm:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-lg transition-all active:scale-[0.985]"
                    >
                      BOOK YOUR APPOINTMENT
                    </Link>
                    <a href="#services" className="group inline-flex items-center justify-center border border-white/70 hover:bg-white/10 text-white font-medium px-6 sm:px-12 py-3 sm:py-4 rounded-full text-sm sm:text-lg transition-all">EXPLORE SERVICES</a>
                  </div>
                </div>
                
                <div className="absolute bottom-4 sm:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/60 text-[10px] sm:text-xs tracking-widest">
                  SCROLL <div className="h-px w-6 bg-white/40 my-1.5 sm:my-3" /> ATTAPUR, HYDERABAD
                </div>
              </div>

              {/* Info Bar - compact on mobile */}
              <div className="border-b border-zinc-200 dark:border-[#2A3441] bg-white dark:bg-[#151B23]">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 text-sm">
                  <div className="p-4 sm:p-8 flex items-start gap-3 sm:gap-5">
                    <div className="mt-1">
                      <div className="w-3 h-px bg-[#FF6B35] dark:bg-[#D4AF37] mb-2" />
                      <div className="w-6 h-px bg-[#FF6B35] dark:bg-[#D4AF37]" />
                    </div>
                    <div>
                      <div className="font-mono text-xs mb-2 tracking-[3px] text-zinc-500 dark:text-zinc-400">LOCATION</div>
                      <div className="leading-tight">Golden Heights, Phase-2<br />Jana Chaitanya Colony, Road No 21<br />Attapur, Hyderabad 500048</div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 flex items-start gap-3 sm:gap-5">
                    <div className="mt-1">
                      <div className="w-3 h-px bg-[#FF6B35] dark:bg-[#D4AF37] mb-2" />
                      <div className="w-6 h-px bg-[#FF6B35] dark:bg-[#D4AF37]" />
                    </div>
                    <div>
                      <div className="font-mono text-xs mb-2 tracking-[3px] text-zinc-500 dark:text-zinc-400">CONTACT</div>
                      <a href="tel:7032688395" className="hover:underline">+91 70326 88395</a><br />
                      <a href="mailto:hello@goldengrovedental.com" className="hover:underline">hello@goldengrovedental.com</a>
                    </div>
                  </div>
                  <div className="p-4 sm:p-8 flex items-start gap-3 sm:gap-5">
                    <div className="mt-1">
                      <div className="w-3 h-px bg-[#FF6B35] dark:bg-[#D4AF37] mb-2" />
                      <div className="w-6 h-px bg-[#FF6B35] dark:bg-[#D4AF37]" />
                    </div>
                    <div>
                      <div className="font-mono text-xs mb-2 tracking-[3px] text-zinc-500 dark:text-zinc-400">HOURS</div>
                      MON–SAT  9:00 AM – 7:30 PM<br />
                      SUNDAY  10:00 AM – 3:00 PM
                    </div>
                  </div>
                </div>
              </div>

              {/* Services Section - 2 cols mobile to reduce scroll */}
              <div id="services" className="max-w-6xl mx-auto px-3 sm:px-6 py-10 sm:py-24">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 sm:gap-4 mb-6 sm:mb-12">
                  <div>
                    <div className="uppercase tracking-[4px] text-[10px] sm:text-xs text-[#FF6B35] dark:text-[#FFB088] mb-2 sm:mb-3">WHAT WE OFFER</div>
                    <div className="text-2xl sm:text-6xl md:text-7xl tracking-tighter">Signature Services</div>
                  </div>
                  <Link to="/book" className="hidden md:block group flex items-center gap-3 text-sm hover:text-[#FF6B35] dark:hover:text-[#FFB088] transition-colors duration-300">
                    BOOK A CONSULTATION <span className="group-hover:translate-x-1 transition">→</span>
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {serviceList.map((service, index) => (
                    <motion.div 
                      key={index}
                      whileHover={{ y: -6 }}
                      className="group bg-white dark:bg-[#151B23] rounded-xl sm:rounded-3xl overflow-hidden border border-zinc-100 dark:border-[#2A3441] card-hover card-premium flex flex-col transition-all duration-300"
                    >
                      <div className="h-36 sm:h-72 relative overflow-hidden">
                        <img 
                          src={serviceImages[service]} 
                          alt={service} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent dark:from-transparent dark:to-transparent" />
                        <div className={`absolute inset-0 pointer-events-none ${index % 3 === 0 ? 'card-overlay-1' : index % 3 === 1 ? 'card-overlay-2' : 'card-overlay-3'} opacity-0 dark:opacity-100`} aria-hidden />
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 to-transparent dark:from-black/60 dark:to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 sm:bottom-8 sm:left-8 sm:right-8">
                          <div className="text-white text-sm sm:text-4xl tracking-[-1px] font-medium leading-tight sm:leading-none drop-shadow-sm">{service}</div>
                        </div>
                      </div>
                      
                      <div className="p-3 sm:p-8 flex-1 flex flex-col dark:bg-[#151B23]">
                        <button 
                          onClick={() => navigate('/book')}
                          className="mt-2 sm:mt-6 self-start flex items-center text-xs sm:text-sm font-medium border-b border-zinc-900 dark:border-[#A8B3BF] pb-0.5 hover:border-[#FF6B35] dark:hover:border-[#FFB088] hover:text-[#FF6B35] dark:hover:text-[#FFB088] transition-colors duration-300"
                        >
                          SCHEDULE
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Doctor section - compact on mobile */}
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
                <div className="bg-white dark:bg-[#151B23] rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-[#2A3441] overflow-hidden flex flex-col md:flex-row items-center gap-6 sm:gap-16 p-5 sm:p-12 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300">
                  <div className="flex-shrink-0 w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-[#FF6B35]/10 dark:bg-[#FF6B35]/20 flex items-center justify-center">
                    <span className="text-3xl sm:text-5xl md:text-6xl font-semibold text-[#FF6B35] dark:text-[#FFB088]">IF</span>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <div className="text-[#FF6B35] dark:text-[#FFB088] text-xs sm:text-sm tracking-[3px] uppercase mb-1 sm:mb-2">Your Dentist</div>
                    <h2 className="text-2xl sm:text-4xl font-medium tracking-tight mb-2 sm:mb-4 text-zinc-900 dark:text-[#F8F6F3]">Dr. Insha Farheen</h2>
                    <p className="text-zinc-600 dark:text-[#A8B3BF] mb-4 sm:mb-6 max-w-xl text-sm sm:text-base">BDS. Leading Golden Grove Dental Lounge with a focus on personalized care and modern dentistry.</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-semibold text-[#FF6B35] dark:text-[#FFB088]">4.9</span>
                        <span className="text-zinc-500 dark:text-[#6B7785]">Rating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-semibold text-[#FF6B35] dark:text-[#FFB088]">700+</span>
                        <span className="text-zinc-500 dark:text-[#6B7785]">Happy Customers</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* About - compact on mobile */}
              <div className="bg-zinc-950 text-white py-10 sm:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
                  <div className="text-[#D4AF37] text-xs sm:text-sm tracking-[4px] mb-3 sm:mb-4">OUR PHILOSOPHY</div>
                  <div className="text-2xl sm:text-5xl md:text-6xl tracking-tight leading-snug sm:leading-tight mb-4 sm:mb-8">We believe in dentistry that restores confidence and transforms smiles.</div>
                  <p className="max-w-md mx-auto text-sm sm:text-xl text-white/60">Led by Dr. Insha Farheen, our practice combines the latest techniques with genuine warmth and personal attention.</p>
                </div>
              </div>
            </div>
          } />

          {/* Book Appointment — layout: hero, service cards, schedule, type, form */}
          <Route path="/book" element={
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-16">
              {/* Hero / Banner */}
              <div className="rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 mb-10 sm:mb-14">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="p-8 sm:p-12 flex flex-col justify-center">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">Looking for your preferred dentist?</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-1 font-medium">Dr. Insha Farheen</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">General &amp; cosmetic dentistry, 10+ years experience</p>
                    <a href="#book-form" className="inline-flex items-center justify-center w-fit px-8 py-3.5 rounded-2xl btn-premium text-white font-medium text-sm tracking-wide">
                      Book appointment
                    </a>
                  </div>
                  <div className="relative min-h-[220px] md:min-h-[280px] bg-zinc-200">
                    <img src="/images/hero.jpg" alt="Dr. Insha Farheen" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              {/* Service category cards */}
              <div className="mb-10 sm:mb-14">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Choose a service</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 scrollbar-thin">
                  {serviceList.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBookService(s)}
                      className={`flex-shrink-0 w-[120px] sm:w-[130px] rounded-2xl border-2 p-4 sm:p-5 flex flex-col items-center gap-2 transition-all ${bookService === s ? 'border-[#FF6B35] dark:border-[#FFB088] bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10' : 'border-zinc-200 dark:border-[#2A3441] bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-500'}`}
                    >
                      <Smile className="w-8 h-8 sm:w-9 sm:h-9" style={{ color: bookService === s ? '#FF6D29' : serviceColors[s] }} />
                      <span className={`text-xs sm:text-sm font-medium text-center leading-tight ${bookService === s ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'text-zinc-700 dark:text-zinc-300'}`}>{s}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule section */}
              <div className="mb-10 sm:mb-14 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#151B23] overflow-hidden">
                <button type="button" onClick={() => setScheduleCollapsed(!scheduleCollapsed)} className="w-full flex items-center justify-between p-5 sm:p-6 text-left">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Schedule</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Book and manage your dental appointments with ease.</p>
                  </div>
                  <span className="text-zinc-400">{scheduleCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5 rotate-90" />}</span>
                </button>
                {!scheduleCollapsed && (
                  <div className="px-5 sm:px-6 pb-6 border-t border-zinc-100">
                    <div className="flex items-center justify-between mt-5 mb-4">
                      <span className="font-medium text-zinc-800">{format(bookMonth, 'MMMM yyyy')}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setBookMonth(subMonths(bookMonth, 1))} className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setBookMonth(addMonths(bookMonth, 1))} className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
                      {eachDayOfInterval({ start: startOfMonth(bookMonth), end: endOfMonth(bookMonth) })
                        .filter((d) => format(d, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd'))
                        .map((d) => {
                          const dateStr = format(d, 'yyyy-MM-dd');
                          const isSelected = bookDate === dateStr;
                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => setBookDate(dateStr)}
                              className={`flex-shrink-0 w-14 sm:w-16 py-3 rounded-xl border-2 text-center transition-all ${isSelected ? 'border-[#FF6B35] dark:border-[#FFB088] bg-[#FF6B35]/10 dark:bg-[#FF6B35]/20 text-[#FF6B35] dark:text-[#FFB088]' : 'border-zinc-200 hover:border-zinc-300'}`}
                            >
                              <div className="text-sm font-medium">{format(d, 'd')}</div>
                              <div className="text-[10px] text-zinc-500">{format(d, 'EEE')}</div>
                            </button>
                          );
                        })}
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">Preferred time</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {['8:00', '8:30', '9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBookTime(t)}
                          className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${bookTime === t ? 'border-[#FF6B35] dark:border-[#FFB088] bg-[#FF6B35]/10 dark:bg-[#FF6B35]/20 text-[#FF6B35] dark:text-[#FFB088]' : 'border-zinc-200 hover:border-zinc-300'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Type of reservation */}
              <div className="mb-10 sm:mb-14">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Type of reservation</h2>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: 'consultation' as const, label: 'Consultation', icon: User },
                    { id: 'first' as const, label: 'First visit', icon: Stethoscope },
                    { id: 'followup' as const, label: 'Follow-up', icon: Calendar },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBookVisitType(id)}
                      className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 transition-all ${bookVisitType === id ? 'border-[#FF6B35] dark:border-[#FFB088] bg-[#FF6B35]/5 dark:bg-[#FF6B35]/10 text-[#FF6B35] dark:text-[#FFB088]' : 'border-zinc-200 hover:border-zinc-300'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div id="book-form" className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#151B23] p-6 sm:p-10">
                <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Your details</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">We’ll call you within 3 hours to confirm your slot.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const dateVal = formData.get('date') as string;
                    const timeVal = formData.get('time') as string;
                    const newAppt = {
                      patientName: formData.get('name') as string,
                      phone: formData.get('phone') as string,
                      email: formData.get('email') as string,
                      service: formData.get('service') as string,
                      preferredDate: dateVal && timeVal ? `${dateVal}T${timeVal}:00` : (dateVal ? `${dateVal}T10:00:00` : ''),
                    };
                    if (!newAppt.patientName || !newAppt.phone || !newAppt.email || !newAppt.service) {
                      toast.error('Please fill all fields');
                      return;
                    }
                    if (!newAppt.preferredDate) {
                      toast.error('Please pick a date and time above');
                      return;
                    }
                    addAppointment(newAppt);
                    e.currentTarget.reset();
                    setBookService('');
                    setBookDate('');
                    setBookTime('10:00');
                    toast.success('Request sent. We’ll call you within 3 hours to confirm.');
                  }}
                  className="space-y-5"
                >
                  <input type="hidden" name="service" value={bookService} />
                  <input type="hidden" name="date" value={bookDate} />
                  <input type="hidden" name="time" value={bookTime} />
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Your name</label>
                    <input type="text" name="name" required placeholder="Your name" className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Phone</label>
                      <input type="tel" name="phone" required placeholder="Phone number" className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                      <input type="email" name="email" required placeholder="Email address" className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" />
                    </div>
                  </div>
                  {(!bookService || !bookDate) && (
                    <p className="text-sm text-amber-600">Please select a service and a date above.</p>
                  )}
                  <motion.button
                    type="submit"
                    disabled={!bookService || !bookDate}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl btn-premium disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium tracking-wide"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Request appointment
                  </motion.button>
                </form>
              </div>
            </div>
          } />

          {/* Login */}
          <Route path="/login" element={
            <div className="min-h-[80vh] flex items-center justify-center px-6">
              <div className="w-full max-w-md">
                <div className="text-center mb-12">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FF6B35] dark:bg-gradient-to-br dark:from-[#FF6B35] dark:to-[#D4AF37] flex items-center justify-center mb-8 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <Users className="text-white" size={36} />
                  </div>
                  <div className="text-4xl tracking-tight dark:text-zinc-100">Admin Access</div>
                  <p className="mt-4 text-zinc-500 dark:text-zinc-400">Dr. Insha Farheen and Team</p>
                </div>

                <div className="glass dark:bg-[#151B23]/95 dark:border-zinc-700 p-12 rounded-3xl border border-zinc-200">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      login(
                        formData.get('email') as string,
                        formData.get('password') as string
                      );
                    }}
                    className="space-y-8"
                  >
                    <div>
                      <div className="text-sm tracking-widest mb-2 text-zinc-700 dark:text-zinc-300 font-medium">EMAIL ADDRESS</div>
                      <input 
                        type="email" 
                        name="email" 
                        defaultValue={useSupabase ? '' : ADMIN_EMAIL}
                        placeholder={useSupabase ? 'Admin email' : undefined}
                        className="w-full px-6 py-4 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] text-xl bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" 
                        required 
                      />
                    </div>
                    
                    <div>
                      <div className="text-sm tracking-widest mb-2 text-zinc-700 dark:text-zinc-300 font-medium">PASSWORD</div>
                      <input 
                        type="password" 
                        name="password" 
                        defaultValue={useSupabase ? '' : ADMIN_PASSWORD}
                        placeholder={useSupabase ? 'Password' : undefined}
                        className="w-full px-6 py-4 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] text-xl bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" 
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 rounded-2xl btn-premium-gold text-white text-sm tracking-[2px] mt-4"
                    >
                      SIGN IN TO DASHBOARD
                    </button>
                  </form>
                </div>
                
                <div className="text-center text-xs mt-8 text-zinc-600 dark:text-zinc-400">
                  {useSupabase ? 'Secure access for authorized personnel only' : 'DEMO MODE • Secure access for authorized personnel only'}
                </div>
              </div>
            </div>
          } />

          {/* Protected Routes */}
          {isAuthenticated ? (
            <>
              {/* Dashboard */}
              <Route path="/dashboard" element={
                <div className="max-w-7xl mx-auto px-6 py-12">
                  <div className="flex justify-between items-end mb-16">
                    <div>
                      <div className="text-xs tracking-[4px] text-[#FF6B35] dark:text-[#FFB088]">OVERVIEW</div>
                      <div className="text-[68px] leading-none tracking-[-3.2px]">Good morning, Doctor</div>
                    </div>
                    <div className="text-right text-sm text-zinc-600 dark:text-zinc-400">Updated moments ago • {format(new Date(), 'EEEE, MMMM dd')}</div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-14">
                    {[
                      { label: "TODAY'S APPOINTMENTS", value: todayAppts, icon: Clock, color: "#FF6B35" },
                      { label: "PENDING APPROVALS", value: pendingCount, icon: Users, color: "#D4AF37" },
                      { label: "TODAY'S REVENUE", value: `₹${todayRevenue}`, icon: DollarSign, color: "#1E40AF" },
                      { label: "THIS WEEK", value: `₹${weekTotal}`, icon: CheckCircle, color: "#FF6B35" },
                      { label: "THIS MONTH", value: `₹${monthTotal}`, icon: DollarSign, color: "#1E40AF" },
                    ].map((stat, index) => (
                      <div key={index} className="bg-white dark:bg-[#151B23] p-9 rounded-3xl border border-zinc-100 dark:border-[#2A3441] flex flex-col min-w-0 overflow-hidden">
                        <div className="flex justify-between mb-8">
                          <stat.icon className="text-4xl shrink-0" style={{ color: stat.color }} />
                          <div className="text-xs self-end tracking-widest text-right text-zinc-600 dark:text-zinc-400">CURRENT</div>
                        </div>
                        <div className="text-4xl sm:text-5xl lg:text-4xl font-semibold tabular-nums tracking-tight leading-none mb-auto break-words">{stat.value}</div>
                        <div className="text-sm tracking-widest text-zinc-700 dark:text-zinc-300 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Appointments by day — click a name to open & reschedule */}
                  <div className="mb-14">
                    <div className="text-xl tracking-tight mb-2">Appointments by day</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Click a name to open details, change visit date, or record payment.</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-[#151B23] rounded-2xl border border-zinc-100 dark:border-[#2A3441] p-6">
                        <div className="text-xs tracking-widest text-[#FF6B35] dark:text-[#FFB088] mb-3">TODAY</div>
                        <div className="text-2xl font-semibold tabular-nums mb-4">{todayApptList.length}</div>
                        {todayApptList.length === 0 ? (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">No appointments today</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {todayApptList.map((a) => (
                              <li
                                key={a.id}
                                onClick={() => { setSelectedAppt(a); setShowApptModal(true); setShowRescheduleInline(false); }}
                                className="flex justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                              >
                                <span className="truncate font-medium">{a.patientName}</span>
                                <span className="text-zinc-500 shrink-0">{a.service}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="bg-white dark:bg-[#151B23] rounded-2xl border border-zinc-100 dark:border-[#2A3441] p-6">
                        <div className="text-xs tracking-widest text-[#FF6B35] dark:text-[#FFB088] mb-3">TOMORROW</div>
                        <div className="text-2xl font-semibold tabular-nums mb-4">{tomorrowApptList.length}</div>
                        {tomorrowApptList.length === 0 ? (
                          <p className="text-sm text-zinc-400">No appointments tomorrow</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {tomorrowApptList.map((a) => (
                              <li
                                key={a.id}
                                onClick={() => { setSelectedAppt(a); setShowApptModal(true); setShowRescheduleInline(false); }}
                                className="flex justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                              >
                                <span className="truncate font-medium">{a.patientName}</span>
                                <span className="text-zinc-500 shrink-0">{a.service}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="bg-white dark:bg-[#151B23] rounded-2xl border border-zinc-100 dark:border-[#2A3441] p-6 md:col-span-2 lg:col-span-1">
                        <div className="text-xs tracking-widest text-[#FF6B35] dark:text-[#FFB088] mb-3">UPCOMING</div>
                        {upcomingAppointmentsByDay.length === 0 ? (
                          <p className="text-sm text-zinc-400">No other upcoming dates</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {upcomingAppointmentsByDay.map(([dateStr, list]) => (
                              <li key={dateStr} className="mb-3">
                                <span className="font-medium text-zinc-700">{format(parseISO(dateStr), 'EEE, dd MMM')}</span>
                                <span className="text-zinc-500 ml-2">— {list.length} appointment{list.length !== 1 ? 's' : ''}</span>
                                <ul className="mt-2 space-y-1">
                                  {list.map((a) => (
                                    <li
                                      key={a.id}
                                      onClick={() => { setSelectedAppt(a); setShowApptModal(true); setShowRescheduleInline(false); }}
                                      className="flex justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                                    >
                                      <span className="truncate font-medium">{a.patientName}</span>
                                      <span className="text-zinc-500 shrink-0">{a.service}</span>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Return visits — booked (will visit back) + offline */}
                  <div className="mb-14">
                    <div className="text-xl tracking-tight mb-2">Return visits</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Patients who are expected to come back. Click to open the record and add payment when they return.</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-[#151B23] rounded-2xl border border-zinc-100 dark:border-[#2A3441] p-6">
                        <div className="text-xs tracking-widest text-[#FF6B35] dark:text-[#FFB088] mb-3">BOOKED (from appointments)</div>
                        <div className="text-2xl font-semibold tabular-nums mb-4">{returnVisitAppointments.length}</div>
                        {returnVisitAppointments.length === 0 ? (
                          <p className="text-sm text-zinc-400">None</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {returnVisitAppointments.map((a) => (
                              <li
                                key={a.id}
                                onClick={() => { setSelectedAppt(a); setShowApptModal(true); setShowRescheduleInline(false); }}
                                className="flex justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                              >
                                <span className="truncate font-medium">{a.patientName}</span>
                                <span className="text-zinc-500 shrink-0">{a.service}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="bg-white dark:bg-[#151B23] rounded-2xl border border-zinc-100 dark:border-[#2A3441] p-6">
                        <div className="text-xs tracking-widest text-[#FF6B35] dark:text-[#FFB088] mb-3">OFFLINE (walk-in, will revisit)</div>
                        <div className="text-2xl font-semibold tabular-nums mb-4">{offlineReturnRevenues.length}</div>
                        {offlineReturnRevenues.length === 0 ? (
                          <p className="text-sm text-zinc-400">None</p>
                        ) : (
                          <ul className="space-y-2 text-sm">
                            {offlineReturnRevenues.map((r) => (
                              <li
                                key={r.id}
                                onClick={() => { setRevForReturnPayment(r); setOfflineReturnAmount(0); setOfflineReturnMethod('upi'); setOfflineReturnOutcome('completed'); setOfflineReturnFollowUpNote(''); }}
                                className="flex justify-between gap-2 py-2 px-3 -mx-3 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors border border-transparent hover:border-zinc-100"
                              >
                                <span className="truncate font-medium">{r.notes || '—'}</span>
                                <span className="text-zinc-500 shrink-0">₹{r.amount}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Most popular treatments — statistical representation */}
                  <div className="mb-14">
                    <div className="text-xl tracking-tight mb-2">Most requested treatments</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">Which services patients are booking the most (all time).</div>
                    <div className="bg-white dark:bg-[#151B23] rounded-3xl border border-zinc-100 dark:border-[#2A3441] p-6 sm:p-10">
                      {servicePopularityData.length > 0 ? (
                        <div className="h-[320px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={servicePopularityData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                              <YAxis type="category" dataKey="service" width={140} tick={{ fontSize: 13 }} />
                              <Tooltip cursor={{ fill: 'rgba(0,139,139,0.06)' }} contentStyle={{ borderRadius: 12 }} />
                              <Bar dataKey="count" fill="#FF6B35" radius={[0, 4, 4, 0]} name="Bookings" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="py-16 text-center text-zinc-400 font-medium">No booking data yet. Popular services will appear here.</div>
                      )}
                    </div>
                  </div>

                  {/* Pending Appointments */}
                  <div>
                    <div className="flex items-center justify-between mb-9 px-1">
                      <div>
                        <div className="text-xl tracking-tight text-zinc-900 dark:text-[#F8F6F3]">Awaiting Confirmation</div>
                        <div className="text-sm text-zinc-500 dark:text-[#A8B3BF]">Please review and approve or reschedule</div>
                      </div>
                      <div className="text-xs px-4 py-2 bg-zinc-100 dark:bg-[#1E2830] dark:text-[#F8F6F3] dark:border dark:border-[#2A3441] rounded-full font-medium text-zinc-700 dark:text-[#FFB088]">{pendingCount} PENDING</div>
                    </div>

                    <div className="bg-white dark:bg-[#151B23] rounded-3xl overflow-hidden border border-zinc-100 dark:border-[#2A3441] shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-[#2A3441] text-left text-xs tracking-[1px] text-zinc-500 dark:text-[#6B7785] font-medium">
                            <th className="py-5 pl-6 pr-4 font-normal sticky left-0 z-10 bg-white dark:bg-[#151B23] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">PATIENT</th>
                            <th className="py-5 font-normal">CONTACT</th>
                            <th className="py-5 font-normal">SERVICE</th>
                            <th className="py-5 font-normal">STATUS</th>
                            <th className="py-5 font-normal">PREFERRED DATE</th>
                            <th className="py-5 pr-6 font-normal text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {appointments
                            .filter(a => a.status === 'pending')
                            .sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime())
                            .map((appt, idx) => (
                              <tr key={idx} className="table-row border-b border-zinc-100 dark:border-[#2A3441] last:border-none group">
                                <td className="pl-6 pr-4 py-5 sm:py-7 sticky left-0 z-10 bg-white dark:bg-[#151B23] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">
                                  <div className="font-medium text-zinc-900 dark:text-[#F8F6F3]">{appt.patientName}</div>
                                  <div className="text-xs text-zinc-500 dark:text-[#A8B3BF] mt-0.5">{appt.email}</div>
                                </td>
                                <td className="py-5 sm:py-7 text-sm text-zinc-600 dark:text-[#A8B3BF] font-mono">{appt.phone}</td>
                                <td className="py-5 sm:py-7">
                                  <div className="inline-block px-4 py-px rounded text-xs border" style={{ borderColor: serviceColors[appt.service], color: serviceColors[appt.service] }}>
                                    {appt.service}
                                  </div>
                                </td>
                                <td className="py-5 sm:py-7">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-[#D4AF37]/20 text-amber-800 dark:text-[#D4AF37] border border-amber-200 dark:border-[#D4AF37]/40">Pending</span>
                                </td>
                                <td className="py-5 sm:py-7 text-sm text-zinc-500 dark:text-[#A8B3BF] font-mono tracking-tight">
                                  {format(parseISO(appt.preferredDate), 'EEE, dd MMM yyyy')}
                                </td>
                                <td className="py-5 sm:py-7 pr-6 text-right">
                                  <div className="flex justify-end gap-2 sm:gap-3">
                                    <button 
                                      onClick={() => openApprove(appt.id)}
                                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs px-4 sm:px-5 py-2.5 rounded-full border border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 active:bg-emerald-100 dark:active:bg-emerald-500/30 transition-colors"
                                    >
                                      APPROVE
                                    </button>
                                    <button 
                                      onClick={() => openReject(appt.id)}
                                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs px-4 sm:px-5 py-2.5 rounded-full border border-rose-600 dark:border-rose-500 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 active:bg-rose-100 dark:active:bg-rose-500/30 transition-colors"
                                    >
                                      REJECT
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          {pendingCount === 0 && (
                            <tr>
                              <td colSpan={6} className="py-20 text-center text-sm text-zinc-400 dark:text-[#6B7785]">No pending appointments at this time.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              } />

              {/* Calendar */}
              <Route path="/calendar" element={
                <div className="max-w-5xl mx-auto px-6 py-12">
                  <div className="flex justify-between items-center mb-14">
                    <div>
                      <div className="text-sm uppercase tracking-[3px] text-[#FF6B35] dark:text-[#FFB088]">SCHEDULE</div>
                      <div className="text-[64px] tracking-tight -mt-1 text-zinc-900 dark:text-[#F8F6F3]">Monthly Overview</div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full border border-zinc-200 dark:border-[#2A3441] text-zinc-700 dark:text-[#F8F6F3] hover:bg-zinc-100 dark:hover:bg-[#1E2830] transition-colors"
                        aria-label="Previous month"
                      >←</button>
                      <div className="font-mono text-lg sm:text-2xl px-4 sm:px-8 tabular-nums tracking-tighter text-zinc-900 dark:text-[#F8F6F3]">
                        {format(currentMonth, 'MMMM yyyy')}
                      </div>
                      <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full border border-zinc-200 dark:border-[#2A3441] text-zinc-700 dark:text-[#F8F6F3] hover:bg-zinc-100 dark:hover:bg-[#1E2830] transition-colors"
                        aria-label="Next month"
                      >→</button>
                    </div>
                  </div>

                  {/* Mobile: Upcoming 7 days list (min 44px tap targets) */}
                  <div className="md:hidden bg-white dark:bg-[#151B23] rounded-3xl p-6 border border-zinc-200 dark:border-[#2A3441] shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] mb-6">
                    <div className="text-xs tracking-[2px] text-zinc-500 dark:text-[#A8B3BF] font-medium mb-3">UPCOMING 7 DAYS</div>
                    <ul className="space-y-1">
                      {Array.from({ length: 7 }, (_, i) => {
                        const d = addDays(new Date(), i);
                        const dayAppts = getDayAppointments(d);
                        const isToday = i === 0;
                        return (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => handleDayClick(d)}
                              className="w-full min-h-[44px] flex items-center justify-between gap-3 py-3 px-4 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-[#1E2830] transition-colors border border-transparent dark:border-[#2A3441]/50"
                            >
                              <span className={`tabular-nums font-medium ${isToday ? 'text-[#FF6B35] dark:text-[#FFB088]' : 'text-zinc-900 dark:text-[#F8F6F3]'}`}>
                                {format(d, 'EEE, dd MMM')}{isToday ? ' (Today)' : ''}
                              </span>
                              <span className="text-sm text-zinc-500 dark:text-[#A8B3BF]">
                                {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Desktop: month grid */}
                  <div className="hidden md:block bg-white dark:bg-[#151B23] rounded-3xl p-9 border border-zinc-200 dark:border-[#2A3441] shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300">
                    <div className="grid grid-cols-7 gap-px mb-3 text-xs tracking-[2px] text-center text-zinc-500 dark:text-[#A8B3BF] font-medium">
                      {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                        <div key={i}>{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-zinc-100 dark:bg-[#1E2830] rounded-2xl overflow-hidden">
                      {calendarDays.map((day, index) => {
                        if (!day) {
                          return <div key={index} className="bg-white dark:bg-[#151B23] aspect-square min-h-[44px]" />;
                        }
                        
                        const dayAppts = getDayAppointments(day);
                        const isToday = isSameDay(day, new Date());
                        
                        return (
                          <motion.button
                            type="button"
                            key={index} 
                            onClick={() => handleDayClick(day)}
                            className={`min-h-[44px] aspect-square bg-white dark:bg-[#151B23] flex flex-col p-3 relative cursor-pointer hover:bg-zinc-50 dark:hover:bg-[#1E2830] transition-all group border border-transparent dark:border-[#2A3441]/50 ${isToday ? 'ring-1 ring-inset ring-[#FF6B35] dark:ring-[#FFB088]' : ''}`}
                          >
                            <div className={`text-sm tabular-nums self-end ${isToday ? 'text-[#FF6B35] dark:text-[#FFB088] font-medium' : 'text-zinc-900 dark:text-[#F8F6F3]'}`}>
                              {format(day, 'dd')}
                            </div>
                            
                            {dayAppts.length > 0 && (
                              <div className="mt-auto flex flex-wrap gap-1">
                                {dayAppts.slice(0, 3).map((appt, i) => (
                                  <div 
                                    key={i} 
                                    className="w-2.5 h-2.5 rounded-full" 
                                    style={{ backgroundColor: serviceColors[appt.service] }} 
                                  />
                                ))}
                                {dayAppts.length > 3 && (
                                  <div className="text-[9px] text-zinc-400 dark:text-[#6B7785] self-center">+{dayAppts.length - 3}</div>
                                )}
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 text-xs px-3 flex items-center gap-3 text-zinc-400">
                    <div className="flex-1 h-px bg-zinc-200" /> Colored indicators represent confirmed appointments • Click day to view details
                  </div>
                </div>
              } />

              {/* Revenue Tracker */}
              <Route path="/revenue" element={
                <div className="max-w-6xl mx-auto px-6 py-14">
                  <div className="mb-14">
                    <div className="flex items-end gap-4">
                      <div className="text-[76px] tracking-tight">Revenue</div>
                      <div className="text-[#D4AF37] mb-3 font-light text-xl">TRACKER</div>
                    </div>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xs">Log payments and view financial performance</p>
                  </div>

                  {/* Add Revenue Form — for offline / walk-in visits (no booking) */}
                  <div className="mb-16 bg-white dark:bg-[#151B23] p-12 rounded-3xl border dark:border-[#2A3441] card-premium transition-all duration-300">
                    <div className="uppercase text-xs tracking-[4px] mb-1 text-zinc-800 dark:text-zinc-200 font-semibold">LOG NEW TRANSACTION</div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-6">For offline visits — patients who came without a booking. Enter patient name and treatment, then add to records.</p>
                    
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const amount = parseInt(formData.get('amount') as string);
                        const date = formData.get('date') as string;
                        const method = formData.get('method') as 'cash' | 'card' | 'upi';
                        const notes = (formData.get('notes') as string)?.trim() || '';
                        if (!amount || !date) {
                          toast.error("Please fill amount and date");
                          return;
                        }
                        if (!notes) {
                          toast.error("Please enter patient name and treatment done");
                          return;
                        }
                        const willVisitBack = offlineFormOutcome === 'will_visit_back';
                        const followUpNotes = willVisitBack ? offlineFormFollowUpNote : undefined;
                        const payload = { amount, paymentMethod: method, date, notes, willVisitBack, followUpNotes, source: 'walk_in' as const };
                        if (useSupabase && supabaseClient) {
                          const { data: row, error } = await supabaseClient.from('revenue').insert(mapRevenueToDb(payload)).select('id, amount, payment_method, date, notes, will_visit_back, follow_up_notes, source').single();
                          if (error) {
                            toast.error(error.message || "Failed to add revenue");
                            return;
                          }
                          if (row) setRevenues(prev => [{ ...mapRevenueFromDb(row), willVisitBack: payload.willVisitBack, followUpNotes: payload.followUpNotes }, ...prev]);
                        } else {
                          setRevenues(prev => [{ ...payload, id: crypto.randomUUID() }, ...prev]);
                        }
                        toast.success(willVisitBack ? "Revenue entry added. Record kept open — open from Return visits when they come back." : "Revenue entry added");
                        e.currentTarget.reset();
                        setOfflineFormOutcome('completed');
                        setOfflineFormFollowUpNote('');
                      }}
                      className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-8"
                    >
                      <div className="md:col-span-4">
                        <label className="text-sm block mb-2.5 tracking-widest font-semibold text-zinc-800 dark:text-zinc-200">AMOUNT (₹)</label>
                        <input type="number" name="amount" required className="w-full py-4 px-7 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] text-4xl font-light tabular-nums bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" placeholder="0" min={1} />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-sm block mb-2.5 tracking-widest font-semibold text-zinc-800 dark:text-zinc-200">PAYMENT METHOD</label>
                        <select name="method" className="w-full py-[18px] px-7 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus-within:border-[#FF6B35] dark:focus-within:border-[#D4AF37] text-xl bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3]">
                          <option value="upi">UPI</option>
                          <option value="card">Card</option>
                          <option value="cash">Cash</option>
                        </select>
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-sm block mb-2.5 tracking-widest font-semibold text-zinc-800 dark:text-zinc-200">DATE</label>
                        <input type="date" name="date" defaultValue={todayStr} required className="w-full py-4 px-7 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3]" />
                      </div>
                      <div className="md:col-span-12">
                        <label className="text-sm block mb-2.5 tracking-widest font-semibold text-zinc-800 dark:text-zinc-200">PATIENT NAME &amp; TREATMENT DONE</label>
                        <textarea name="notes" rows={3} required className="w-full py-4 px-7 rounded-2xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] resize-y bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" placeholder="e.g. Priya Mehra – Root Canal" />
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">Type the patient’s name and what treatment was done.</p>
                      </div>
                      <div className="md:col-span-12">
                        <div className="text-sm font-medium text-zinc-700 mb-3">After this visit:</div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setOfflineFormOutcome('completed')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${offlineFormOutcome === 'completed' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                            <span className="font-medium">Completed</span>
                            <span className="block text-xs opacity-90 mt-0.5">No follow-up.</span>
                          </button>
                          <button type="button" onClick={() => setOfflineFormOutcome('will_visit_back')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${offlineFormOutcome === 'will_visit_back' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                            <span className="font-medium">Will visit back</span>
                            <span className="block text-xs opacity-90 mt-0.5">Doctor asked them to return. Open from Return visits.</span>
                          </button>
                        </div>
                        {offlineFormOutcome === 'will_visit_back' && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">Note (optional)</label>
                            <input type="text" value={offlineFormFollowUpNote} onChange={(e) => setOfflineFormFollowUpNote(e.target.value)} placeholder="e.g. Come after 2 weeks" className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none text-sm bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500" />
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-12 pt-4">
                        <button type="submit" className="flex items-center justify-center gap-3 bg-zinc-950 hover:bg-black text-white px-12 py-4 rounded-2xl text-sm tracking-[2px]">
                          <Plus size={18} /> ADD TO RECORDS
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-14">
                    <div className="lg:col-span-3 bg-white dark:bg-[#151B23] p-10 rounded-3xl border dark:border-[#2A3441] h-[410px]">
                      <div className="flex justify-between mb-10">
                        <div>
                          <div className="uppercase text-xs tracking-[3px] text-zinc-800 dark:text-zinc-200 font-semibold">WEEKLY PERFORMANCE</div>
                          <div className="text-2xl mt-1 text-zinc-800 dark:text-zinc-200">Last 7 days</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl tabular-nums tracking-tight text-zinc-800 dark:text-zinc-200">₹{weekTotal}</div>
                          <div className="text-xs text-emerald-600">+14% from last week</div>
                        </div>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={weeklyData}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 11 }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(0,139,139,0.08)' }} 
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px -10px rgb(0 0 0 / 0.2)' }} 
                          />
                          <Bar dataKey="amount" fill="#FF6B35" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-[#151B23] p-10 rounded-3xl border dark:border-[#2A3441] h-[410px] flex flex-col">
                      <div className="uppercase text-xs tracking-[3px] mb-6 text-zinc-800 dark:text-zinc-200 font-semibold">PAYMENT MIX</div>
                      
                      <div className="flex-1 flex items-center justify-center">
                        {paymentData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie 
                                data={paymentData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={72} 
                                outerRadius={112} 
                                dataKey="value"
                              >
                                {paymentData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">No revenue data yet</div>
                        )}
                      </div>
                      
                      <div className="flex justify-center gap-8 text-sm mt-4">
                        {paymentData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{background: item.color}}></div>
                            <span>{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue History */}
                  <div>
                    <div className="flex flex-col gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="text-xl text-zinc-800 dark:text-zinc-200">Recent Transactions</div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Sort:</span>
                          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-700 p-0.5">
                            {(['newest', 'highest', 'lowest'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRevenueSort(s)}
                                className={`px-4 py-2 text-xs rounded-lg transition-colors ${revenueSort === s ? 'bg-[#FF6B35] dark:bg-gradient-to-r dark:from-[#FF6B35] dark:to-[#FFB088] text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1E2830]'}`}
                              >
                                {s === 'newest' ? 'Newest' : s === 'highest' ? 'Highest' : 'Lowest'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          value={revenueSearch}
                          onChange={(e) => setRevenueSearch(e.target.value)}
                          placeholder="Search by patient name or treatment…"
                          className="flex-1 min-w-[200px] text-sm py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">Date:</span>
                        <input
                          type="date"
                          value={revenueDateFrom}
                          onChange={(e) => setRevenueDateFrom(e.target.value)}
                          className="text-xs py-2 px-3 rounded-lg border border-zinc-300 dark:border-[#2A3441] bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3]"
                        />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">to</span>
                        <input
                          type="date"
                          value={revenueDateTo}
                          onChange={(e) => setRevenueDateTo(e.target.value)}
                          className="text-xs py-2 px-3 rounded-lg border border-zinc-300 dark:border-[#2A3441] bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3]"
                        />
                        <button
                          type="button"
                          onClick={() => { setRevenueDateFrom(format(subDays(new Date(), 4), 'yyyy-MM-dd')); setRevenueDateTo(format(new Date(), 'yyyy-MM-dd')); }}
                          className="text-xs text-[#FF6B35] dark:text-[#FFB088] hover:underline"
                        >
                          Last 5 days
                        </button>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">Default: last 5 days. Use date range to see more.</p>
                    </div>

                    <div className="bg-white dark:bg-[#151B23] rounded-3xl overflow-hidden border dark:border-[#2A3441] overflow-x-auto">
                      <table className="w-full text-sm min-w-[520px]">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left text-xs tracking-widest text-zinc-700 dark:text-zinc-300 font-semibold">
                            <th className="pl-6 pr-4 py-5 sm:py-6 sticky left-0 z-10 bg-white dark:bg-[#151B23] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">DATE</th>
                            <th>NOTES</th>
                            <th className="whitespace-nowrap">TYPE</th>
                            <th>METHOD</th>
                            <th className="text-right pr-6">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRevenues.slice(0, 50).map((rev, index) => {
                            const isRevisit = (rev.notes ?? '').toLowerCase().includes('return visit');
                            return (
                              <tr key={rev.id || index} className={`border-b border-zinc-100 dark:border-[#2A3441] last:border-none text-sm ${isRevisit ? 'bg-[#FF6B35]/8' : ''}`}>
                                <td className="pl-6 pr-4 py-5 sm:py-6 font-mono text-xs text-zinc-600 dark:text-zinc-400 sticky left-0 z-10 bg-white dark:bg-[#151B23] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]">{format(parseISO(rev.date), 'dd MMM yyyy')}</td>
                                <td className="py-5 sm:py-6 min-w-[120px]">
                                  <span className={isRevisit ? 'font-medium text-zinc-800 dark:text-zinc-200' : 'text-zinc-800 dark:text-zinc-200'}>{rev.notes || '—'}</span>
                                  {isRevisit && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FF6B35]/20 dark:bg-[#FFB088]/20 text-[#E55A1A] dark:text-[#FFB088]">Revisit</span>
                                  )}
                                </td>
                                <td className="py-5 sm:py-6">
                                  {rev.source === 'walk_in' ? (
                                    <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800">Walk-in</span>
                                  ) : rev.source === 'online' ? (
                                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">Online</span>
                                  ) : (
                                    <span className="text-zinc-600 dark:text-zinc-400">—</span>
                                  )}
                                </td>
                                <td className="py-5 sm:py-6">
                                  <span className="uppercase text-xs px-4 py-px rounded-full border border-zinc-300 dark:border-[#2A3441] text-zinc-700 dark:text-zinc-300">{rev.paymentMethod}</span>
                                </td>
                                <td className="py-5 sm:py-6 pr-6 font-mono text-right tabular-nums font-medium text-zinc-800 dark:text-zinc-200">₹{rev.amount}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {filteredRevenues.length === 0 && (
                        <div className="py-20 text-center text-sm text-zinc-600 dark:text-zinc-400">
                          {revenues.length === 0 ? 'No transactions yet. Add your first above.' : 'No transactions match the selected filters.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              } />
            </>
          ) : (
            <Route path="/dashboard" element={<div className="h-96 flex items-center justify-center">Please log in to access the admin dashboard</div>} />
          )}

          {/* 404 */}
          <Route path="*" element={
            <div className="h-[70vh] flex items-center justify-center text-center">
              <div>
                <div className="text-7xl mb-6">404</div>
                <div className="text-2xl tracking-tight">Page not found</div>
                <Link to="/" className="mt-8 inline-block underline">Return Home</Link>
              </div>
            </div>
          } />
        </Routes>
      </div>

      {/* FOOTER - compact on mobile */}
      <Footer isAuthenticated={isAuthenticated} />

      {/* Modals */}
      <AnimatePresence>
        {/* Approve Modal - assign which day the visit is scheduled */}
        {showApproveModal && pendingApptId && (() => {
          const appt = appointments.find(a => a.id === pendingApptId);
          return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6" onClick={() => setShowApproveModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1E2830] max-w-md w-full rounded-3xl p-12 shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-transparent dark:border-[#2A3441] transition-all duration-300" 
              onClick={e => e.stopPropagation()}
            >
              <div className="text-2xl sm:text-3xl mb-2">Confirm appointment</div>
              {appt && (
                <p className="text-zinc-500 text-sm mb-6">
                  {appt.patientName} • {appt.service}
                </p>
              )}
              <p className="text-zinc-600 text-sm mb-4">Assign this visit to which day? (Patient’s preferred date is pre-filled — change if they’re coming another day.)</p>
              <div className="mb-8">
                <label className="block text-xs tracking-widest text-zinc-500 mb-2">VISIT DATE</label>
                <input
                  type="date"
                  value={approveAssignedDate}
                  onChange={(e) => setApproveAssignedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full py-4 px-4 rounded-2xl border border-zinc-200 focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none text-lg"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 py-4 rounded-2xl border text-sm"
                >CANCEL</button>
                <button 
                  onClick={confirmApprove}
                  className="flex-1 py-4 rounded-2xl btn-premium text-white text-sm tracking-widest"
                >CONFIRM FOR THIS DATE</button>
              </div>
            </motion.div>
          </div>
          );
        })()}

        {/* Reject Modal */}
        {showRejectModal && pendingApptId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6" onClick={() => setShowRejectModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              className="bg-white w-full max-w-md rounded-3xl p-12" 
              onClick={e => e.stopPropagation()}
            >
              <div className="font-medium text-xl mb-8">Reject Appointment</div>
              
              <textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Reason for rejection (e.g. Schedule conflict, Patient no-show etc)" 
                className="h-40 w-full resize-y border p-6 rounded-2xl text-sm" 
              />
              
              <div className="flex gap-4 mt-9">
                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-4 text-sm border rounded-2xl">CANCEL</button>
                <button onClick={confirmReject} disabled={!rejectReason.trim()} className="flex-1 py-4 bg-rose-600 text-white text-sm rounded-2xl disabled:bg-zinc-200">REJECT APPOINTMENT</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Record payment & complete visit modal */}
        {showRecordPaymentModal && apptForPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 overflow-y-auto py-8" onClick={() => { setShowRecordPaymentModal(false); setApptForPayment(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1E2830] max-w-md w-full rounded-3xl p-8 sm:p-12 my-auto shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-transparent dark:border-[#2A3441] transition-all duration-300" 
              onClick={e => e.stopPropagation()}
            >
              <div className="text-2xl sm:text-3xl mb-1">Record payment &amp; save</div>
              <p className="text-zinc-500 text-sm mb-1">{apptForPayment.patientName} • {apptForPayment.service}</p>
              {apptForPayment.followUpNotes && (
                <p className="text-xs text-amber-600 mb-4">Return visit — same record. Add this payment and update below.</p>
              )}
              
              <div className="space-y-6">
                <div>
                  <div className="text-sm mb-2 font-semibold text-zinc-800 dark:text-zinc-200">AMOUNT (₹)</div>
                  <input 
                    type="number" 
                    value={recordAmount || ''} 
                    onChange={(e) => setRecordAmount(parseInt(e.target.value) || 0)} 
                    placeholder="0"
                    className="w-full py-4 px-4 border border-zinc-300 dark:border-[#2A3441] rounded-2xl text-2xl tabular-nums focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" 
                  />
                </div>
                <div>
                  <div className="text-sm mb-3 font-semibold text-zinc-800 dark:text-zinc-200">PAYMENT METHOD</div>
                  <div className="flex gap-3">
                    {(['upi', 'card', 'cash'] as const).map(m => (
                      <button 
                        key={m} 
                        onClick={() => setRecordMethod(m)}
                        className={`flex-1 py-3 text-sm tracking-widest rounded-2xl border transition-all ${recordMethod === m ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-300 dark:border-[#2A3441] hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-800 dark:text-zinc-200'}`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6">
                  <div className="text-sm font-medium text-zinc-700 mb-3">After this visit:</div>
                  <div className="flex gap-3 mb-4">
                    <button type="button" onClick={() => setVisitOutcome('completed')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${visitOutcome === 'completed' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                      <span className="font-medium">Completed</span>
                      <span className="block text-xs opacity-90 mt-0.5">No follow-up. Close this record.</span>
                    </button>
                    <button type="button" onClick={() => setVisitOutcome('will_visit_back')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${visitOutcome === 'will_visit_back' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                      <span className="font-medium">Will visit back</span>
                      <span className="block text-xs opacity-90 mt-0.5">Keep record open. Open same when they return.</span>
                    </button>
                  </div>
                  {visitOutcome === 'will_visit_back' && (
                    <div className="space-y-4 pl-1">
                      <div>
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-2">Come again after</div>
                        <div className="flex flex-wrap gap-2">
                          {['3', '7', '14', '21', '30'].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => { setFollowUpDays(d); setFollowUpCustomDays(''); }}
                              className={`px-4 py-2 text-sm rounded-xl border transition-colors ${followUpDays === d && followUpDays !== 'custom' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}
                            >
                              {d} days
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setFollowUpDays('custom')}
                            className={`px-4 py-2 text-sm rounded-xl border transition-colors ${followUpDays === 'custom' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}
                          >
                            Custom
                          </button>
                        </div>
                        {followUpDays === 'custom' && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              value={followUpCustomDays}
                              onChange={(e) => setFollowUpCustomDays(e.target.value)}
                              placeholder="Number of days"
                              className="w-32 py-2 px-3 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none text-sm bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3]"
                            />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">days</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-2">Note (optional)</div>
                        <textarea
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          placeholder="e.g. Check treatment status"
                          rows={2}
                          className="w-full py-3 px-4 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none text-sm resize-y bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-4 mt-10">
                <button 
                  onClick={() => { setShowRecordPaymentModal(false); setApptForPayment(null); }}
                  className="flex-1 py-4 rounded-2xl border text-sm"
                >CANCEL</button>
                <button 
                  onClick={confirmRecordPayment}
                  disabled={recordAmount <= 0}
                  className="flex-1 py-4 rounded-2xl btn-premium text-white text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                >{visitOutcome === 'completed' ? 'SAVE &amp; COMPLETE' : 'SAVE (record stays open)'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Offline return payment modal — add payment when offline patient revisits */}
        {revForReturnPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 overflow-y-auto py-8" onClick={() => setRevForReturnPayment(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white dark:bg-[#1E2830] max-w-md w-full rounded-3xl p-8 sm:p-12 my-auto shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-transparent dark:border-[#2A3441] transition-all duration-300"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-2xl sm:text-3xl mb-1">Add return payment</div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">{revForReturnPayment.notes || '—'}</p>
              <div className="space-y-6">
                <div>
                  <div className="text-sm mb-2 font-semibold text-zinc-800 dark:text-zinc-200">AMOUNT (₹)</div>
                  <input
                    type="number"
                    value={offlineReturnAmount || ''}
                    onChange={(e) => setOfflineReturnAmount(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full py-4 px-4 border border-zinc-300 dark:border-[#2A3441] rounded-2xl text-2xl tabular-nums focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <div className="text-sm mb-3 font-semibold text-zinc-800 dark:text-zinc-200">PAYMENT METHOD</div>
                  <div className="flex gap-3">
                    {(['upi', 'card', 'cash'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setOfflineReturnMethod(m)}
                        className={`flex-1 py-3 text-sm tracking-widest rounded-2xl border transition-all ${offlineReturnMethod === m ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}
                      >
                        {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t border-zinc-100 pt-6">
                  <div className="text-sm font-medium text-zinc-700 mb-3">After this visit:</div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setOfflineReturnOutcome('completed')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${offlineReturnOutcome === 'completed' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                      <span className="font-medium">Completed</span>
                      <span className="block text-xs opacity-90 mt-0.5">Close this record.</span>
                    </button>
                    <button type="button" onClick={() => setOfflineReturnOutcome('will_visit_back')} className={`flex-1 py-3 px-4 text-sm rounded-2xl border transition-all text-left ${offlineReturnOutcome === 'will_visit_back' ? 'border-[#FF6D29] bg-[#FF6B35] text-white' : 'border-zinc-200 hover:border-zinc-300'}`}>
                      <span className="font-medium">Will visit back</span>
                      <span className="block text-xs opacity-90 mt-0.5">Keep record open.</span>
                    </button>
                  </div>
                  {offlineReturnOutcome === 'will_visit_back' && (
                    <div className="mt-4">
                      <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mb-2">Note (optional)</div>
                      <textarea value={offlineReturnFollowUpNote} onChange={(e) => setOfflineReturnFollowUpNote(e.target.value)} placeholder="e.g. Come after 2 weeks" rows={2} className="w-full py-3 px-4 rounded-xl border border-zinc-300 dark:border-[#2A3441] focus:border-[#FF6B35] dark:focus:border-[#D4AF37] outline-none text-sm resize-y bg-white dark:bg-[#1E2830] text-zinc-900 dark:text-[#F8F6F3] placeholder:text-zinc-500 dark:placeholder:text-zinc-400" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setRevForReturnPayment(null)} className="flex-1 py-4 rounded-2xl border text-sm">CANCEL</button>
                <button type="button" onClick={confirmOfflineReturnPayment} disabled={offlineReturnAmount <= 0} className="flex-1 py-4 rounded-2xl btn-premium text-white text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                  {offlineReturnOutcome === 'completed' ? 'SAVE &amp; CLOSE' : 'SAVE (record stays open)'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Calendar Day Detail Modal */}
        {showDayModal && selectedDayAppts.length > 0 && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6" onClick={() => setShowDayModal(false)}>
            <motion.div 
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-12 py-9 border-b flex justify-between">
                <div>
                  <div className="text-xs tracking-[3px] text-zinc-400">SCHEDULED FOR</div>
                  <div className="text-5xl tabular-nums tracking-tight">{format(parseISO(selectedDayAppts[0].preferredDate), 'dd MMMM')}</div>
                </div>
                <button onClick={() => setShowDayModal(false)} className="self-start">✕</button>
              </div>

              <div className="divide-y max-h-[420px] overflow-auto">
                {selectedDayAppts.map((appt, index) => (
                  <div 
                    key={index} 
                    onClick={() => handleApptClick(appt)}
                    className="px-12 py-8 flex justify-between hover:bg-zinc-50 cursor-pointer group"
                  >
                    <div>
                      <div className="font-medium text-lg group-hover:text-[#FF6B35] dark:text-[#FFB088]">{appt.patientName}</div>
                      <div className="text-sm text-zinc-500">{appt.service}</div>
                    </div>
                    <div className="text-right text-xs pt-1">
                      {format(parseISO(appt.preferredDate), 'HH:mm')} • {appt.status}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Single Appointment Detail Modal */}
        {showApptModal && selectedAppt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-6" onClick={() => { setShowApptModal(false); setShowRescheduleInline(false); }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-12"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-xs text-zinc-400 mb-1 tracking-widest">{selectedAppt.status === 'completed' ? 'COMPLETED' : 'CONFIRMED'} APPOINTMENT</div>
              <div className="text-[43px] tracking-tight leading-none mb-8">{selectedAppt.patientName}</div>

              <div className="space-y-6 text-sm">
                <div className="flex justify-between border-b pb-6">
                  <div>SERVICE</div>
                  <div className="text-right">{selectedAppt.service}</div>
                </div>
                <div className="flex justify-between border-b pb-6">
                  <div>DATE &amp; TIME</div>
                  <div className="text-right tabular-nums">{format(parseISO(selectedAppt.confirmedDate || selectedAppt.preferredDate), "EEEE, dd MMMM yyyy 'at' HH:mm")}</div>
                </div>
                <div className="flex justify-between border-b pb-6">
                  <div>CONTACT</div>
                  <div className="text-right font-mono">{selectedAppt.phone} • {selectedAppt.email}</div>
                </div>
                <div className="flex justify-between border-b pb-6">
                  <div>STATUS</div>
                  <div className={`px-4 py-px rounded-full text-xs inline-block self-start ${selectedAppt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : selectedAppt.status === 'completed' ? 'bg-zinc-100 text-zinc-700' : ''}`}>{selectedAppt.status.toUpperCase()}</div>
                </div>
                {selectedAppt.status === 'completed' && selectedAppt.followUpNotes && (
                  <div className="flex flex-col gap-1 border-b pb-6">
                    <div className="text-zinc-500">FOLLOW-UP</div>
                    <div className="text-right text-zinc-700">{selectedAppt.followUpNotes}</div>
                  </div>
                )}
              </div>

              {selectedAppt.status === 'confirmed' && (
                <>
                  {!showRescheduleInline ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRescheduleInline(true);
                        const d = selectedAppt.confirmedDate || selectedAppt.preferredDate;
                        setRescheduleDate(d ? d.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'));
                      }}
                      className="mt-8 w-full py-3 rounded-2xl text-sm tracking-wide border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    >
                      Change visit date
                    </button>
                  ) : (
                    <div className="mt-8 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <div className="text-xs text-zinc-500 mb-2">New visit date</div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={e => setRescheduleDate(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateVisitDate(selectedAppt.id, rescheduleDate)}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-[#FF6B35] text-white hover:opacity-90"
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRescheduleInline(false)}
                          className="px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <button 
                    onClick={() => openRecordPayment(selectedAppt)}
                    className="mt-4 w-full py-4 rounded-2xl text-sm tracking-widest border border-[#FF6D29] hover:bg-[#FF6B35] hover:text-white"
                  >
                    RECORD PAYMENT &amp; COMPLETE VISIT
                  </button>
                </>
              )}

              <div onClick={() => { setShowApptModal(false); setShowRescheduleInline(false); }} className="mt-7 text-center text-xs cursor-pointer text-zinc-400">CLOSE WINDOW</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
