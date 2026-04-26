import { NextRequest, NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualification: string;
  yearsOfExperience: number;
  phone: string;
  email: string;
  consultationFee: number;
  availability: 'available' | 'in_consultation' | 'off_duty' | 'on_leave';
  languages: string[];
  rating: number;
  reviewCount: number;
  todayAppointments: number;
  patientsThisWeek: number;
  availableDays: string[];
  availableSlots: string[];
  bio: string;
  createdAt: string;
}

interface TimeSlot {
  time: string;
  doctorId: string;
  doctorName: string;
  type: 'appointment' | 'break' | 'consultation';
}

// ─── Mock Data ───────────────────────────────────────────────────────────────────

const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'DOC-001',
    name: 'Dr. Rajesh Sharma',
    specialization: 'General Physician',
    qualification: 'MBBS, MD (General Medicine)',
    yearsOfExperience: 12,
    phone: '9876543210',
    email: 'rajesh.sharma@clinic.in',
    consultationFee: 500,
    availability: 'available',
    languages: ['Hindi', 'English', 'Marathi'],
    rating: 4.8,
    reviewCount: 234,
    todayAppointments: 8,
    patientsThisWeek: 42,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'],
    bio: 'Dr. Rajesh Sharma is an experienced General Physician with 12 years of practice. Specializing in comprehensive primary care, diabetes management, hypertension, and preventive health. He is known for his patient-first approach and thorough diagnostics.',
    createdAt: '2023-01-15',
  },
  {
    id: 'DOC-002',
    name: 'Dr. Priya Patel',
    specialization: 'Gynecologist',
    qualification: 'MBBS, MS (Obstetrics & Gynaecology)',
    yearsOfExperience: 8,
    phone: '9876543211',
    email: 'priya.patel@clinic.in',
    consultationFee: 700,
    availability: 'in_consultation',
    languages: ['Hindi', 'English', 'Gujarati'],
    rating: 4.9,
    reviewCount: 189,
    todayAppointments: 6,
    patientsThisWeek: 35,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    availableSlots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'],
    bio: 'Dr. Priya Patel is a skilled Gynecologist with 8 years of experience in women\'s health. She specializes in high-risk pregnancies, laparoscopic surgeries, and infertility treatments. Her compassionate care has earned her excellent patient reviews.',
    createdAt: '2023-06-20',
  },
  {
    id: 'DOC-003',
    name: 'Dr. Amit Deshmukh',
    specialization: 'Orthopedic',
    qualification: 'MBBS, MS (Orthopaedics), DNB',
    yearsOfExperience: 15,
    phone: '9876543212',
    email: 'amit.deshmukh@clinic.in',
    consultationFee: 800,
    availability: 'available',
    languages: ['Hindi', 'English', 'Marathi'],
    rating: 4.7,
    reviewCount: 312,
    todayAppointments: 5,
    patientsThisWeek: 28,
    availableDays: ['Mon', 'Wed', 'Thu', 'Sat'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM'],
    bio: 'Dr. Amit Deshmukh is a senior Orthopedic surgeon with 15 years of experience. He specializes in joint replacement, sports injuries, and spinal disorders. Known for his expertise in minimally invasive surgical techniques.',
    createdAt: '2022-03-10',
  },
  {
    id: 'DOC-004',
    name: 'Dr. Sneha Kulkarni',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD (Dermatology)',
    yearsOfExperience: 6,
    phone: '9876543213',
    email: 'sneha.kulkarni@clinic.in',
    consultationFee: 600,
    availability: 'off_duty',
    languages: ['Hindi', 'English', 'Kannada'],
    rating: 4.6,
    reviewCount: 156,
    todayAppointments: 0,
    patientsThisWeek: 31,
    availableDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    availableSlots: ['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'],
    bio: 'Dr. Sneha Kulkarni is a Dermatologist with 6 years of experience in cosmetic and clinical dermatology. She specializes in acne treatment, hair loss, skin allergies, and aesthetic procedures including laser treatments.',
    createdAt: '2024-01-05',
  },
  {
    id: 'DOC-005',
    name: 'Dr. Vikram Singh',
    specialization: 'Cardiologist',
    qualification: 'MBBS, DM (Cardiology)',
    yearsOfExperience: 20,
    phone: '9876543214',
    email: 'vikram.singh@clinic.in',
    consultationFee: 1200,
    availability: 'on_leave',
    languages: ['Hindi', 'English', 'Punjabi'],
    rating: 4.9,
    reviewCount: 421,
    todayAppointments: 0,
    patientsThisWeek: 18,
    availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
    availableSlots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
    bio: 'Dr. Vikram Singh is a renowned Cardiologist with 20 years of experience. He specializes in interventional cardiology, heart failure management, and preventive cardiology. He has performed over 5000 cardiac procedures and is recognized nationally for his contributions.',
    createdAt: '2021-08-15',
  },
];

// In-memory store for added doctors
let doctorStore: Doctor[] = [...MOCK_DOCTORS];

// ─── GET Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const clinicId = request.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const specialization = request.nextUrl.searchParams.get('specialization');

    let doctors = [...doctorStore];

    if (specialization && specialization !== 'All') {
      doctors = doctors.filter((d) => d.specialization === specialization);
    }

    // Compute stats
    const totalDoctors = doctorStore.length;
    const availableToday = doctorStore.filter((d) => d.availability === 'available').length;
    const avgRating = (doctorStore.reduce((sum, d) => sum + d.rating, 0) / doctorStore.length).toFixed(1);
    const patientsThisWeek = doctorStore.reduce((sum, d) => sum + d.patientsThisWeek, 0);

    // Build weekly schedule (next 7 days)
    const today = new Date();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const schedule: Record<string, TimeSlot[]> = {};

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = daysOfWeek[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];

      const slots: TimeSlot[] = [];
      for (const doc of doctorStore) {
        if (doc.availableDays.includes(dayName) && doc.availability !== 'on_leave') {
          // Generate 3-5 random appointment slots
          const numSlots = Math.min(Math.floor(Math.random() * 3) + 2, doc.availableSlots.length);
          const shuffled = [...doc.availableSlots].sort(() => Math.random() - 0.5);
          for (let j = 0; j < numSlots; j++) {
            slots.push({
              time: shuffled[j],
              doctorId: doc.id,
              doctorName: doc.name,
              type: 'appointment',
            });
          }
          // Add a break slot
          slots.push({
            time: '01:00 PM',
            doctorId: doc.id,
            doctorName: doc.name,
            type: 'break',
          });
        }
      }

      schedule[dateStr] = slots.sort((a, b) => a.time.localeCompare(b.time));
    }

    // Specialty counts for filter chips
    const specialtyCounts: Record<string, number> = {};
    for (const doc of doctorStore) {
      specialtyCounts[doc.specialization] = (specialtyCounts[doc.specialization] || 0) + 1;
    }

    return NextResponse.json({
      doctors,
      stats: {
        totalDoctors,
        availableToday,
        avgRating: parseFloat(avgRating),
        patientsThisWeek,
      },
      schedule,
      specialtyCounts,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const clinicId = request.headers.get('x-clinic-id');
    if (!clinicId) {
      return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    const body = await request.json();

    const { name, phone, email, specialization, qualification, yearsOfExperience, consultationFee, availableDays, availableHours, languages, bio } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone?.trim() || !/^\d{10}$/.test(phone.trim())) {
      return NextResponse.json({ error: 'Valid 10-digit phone number required' }, { status: 400 });
    }
    if (!specialization) {
      return NextResponse.json({ error: 'Specialization is required' }, { status: 400 });
    }

    // Generate unique doctor ID
    const id = `DOC-${String(doctorStore.length + 1).padStart(3, '0')}`;

    // Generate time slots from available hours
    const slots: string[] = [];
    if (availableHours?.start && availableHours?.end) {
      const startHour = parseInt(availableHours.start.split(':')[0], 10);
      const endHour = parseInt(availableHours.end.split(':')[0], 10);
      const period = (h: number) => h >= 12 ? 'PM' : 'AM';
      const formatHour = (h: number) => {
        const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
        return `${String(display).padStart(2, '0')}:00 ${period(h)}`;
      };
      for (let h = startHour; h < endHour; h++) {
        slots.push(formatHour(h));
        slots.push(formatHour(h) === '09:00 AM' ? '09:30 AM' : `${String(h > 12 ? h - 12 : h === 0 ? 12 : h).padStart(2, '0')}:30 ${period(h)}`);
      }
    } else {
      // Default slots
      for (let h = 9; h <= 16; h++) {
        const display = h > 12 ? h - 12 : h;
        const p = h >= 12 ? 'PM' : 'AM';
        slots.push(`${String(display).padStart(2, '0')}:00 ${p}`);
        slots.push(`${String(display).padStart(2, '0')}:30 ${p}`);
      }
    }

    const newDoctor: Doctor = {
      id,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      specialization,
      qualification: qualification || '',
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
      consultationFee: parseInt(consultationFee, 10) || 500,
      availability: 'available',
      languages: languages || ['Hindi', 'English'],
      rating: 0,
      reviewCount: 0,
      todayAppointments: 0,
      patientsThisWeek: 0,
      availableDays: availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      availableSlots: slots,
      bio: bio || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    doctorStore.push(newDoctor);

    return NextResponse.json({ doctor: newDoctor, message: 'Doctor added successfully' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
