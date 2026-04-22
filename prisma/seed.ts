import { db } from '../src/lib/db';
import { hash } from 'bcryptjs';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0];
const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
const dayAfterStr = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];

function hoursAgo(h: number) {
  return new Date(today.getTime() - h * 3600000).toISOString();
}

async function seed() {
  console.log('🌱 Seeding database...');

  // =============================================
  // 1. Create Users
  // =============================================
  const adminPassword = await hash('admin123', 10);
  const clientPassword = await hash('clinic123', 10);

  const admin = await db.user.upsert({
    where: { email: 'admin@voiceai.in' },
    update: {},
    create: {
      email: 'admin@voiceai.in',
      password: adminPassword,
      name: 'Platform Admin',
      role: 'admin',
      phone: '+91-9876543210',
      isActive: true,
    },
  });

  // =============================================
  // 2. Create Clinics
  // =============================================
  const clinic1 = await db.clinic.create({
    data: {
      name: 'Sharma Dental Clinic',
      doctorName: 'Dr. Rajesh Sharma',
      slug: 'sharma-dental',
      phone: '+91-9810012345',
      email: 'sharma.dental@gmail.com',
      address: '12, MG Road, Lajpat Nagar',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
      sipNumber: '+91-11-45678901',
      sipId: 'VOB-SIP-001',
      escalationNumber: '+91-9810012345',
      businessHours: '09:00-20:00',
      businessDays: 'Mon-Sat',
      services: JSON.stringify(['Dental Checkup', 'Root Canal', 'Teeth Whitening', 'Braces', 'Dentures', 'Cleaning']),
      consultationFee: '500',
      status: 'active',
      planType: 'pro',
      trialEndsAt: new Date('2025-01-15'),
      subscriptionEndsAt: new Date('2025-12-31'),
      whatsappNumber: '+91-9810012345',
      language: 'hinglish',
      totalCalls: 247,
      totalBookings: 89,
      isActive: true,
    },
  });

  const clinic2 = await db.clinic.create({
    data: {
      name: 'Agarwal Eye Hospital',
      doctorName: 'Dr. Priya Agarwal',
      slug: 'agarwal-eye',
      phone: '+91-9820054321',
      email: 'agarwal.eye@gmail.com',
      address: '34, Civil Lines, Near Metro Station',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      sipNumber: '+91-22-45678902',
      sipId: 'VOB-SIP-002',
      escalationNumber: '+91-9820054321',
      businessHours: '10:00-19:00',
      businessDays: 'Mon-Sat',
      services: JSON.stringify(['Eye Checkup', 'LASIK Surgery', 'Cataract Surgery', 'Glaucoma Treatment', 'Contact Lens Fitting']),
      consultationFee: '800',
      status: 'active',
      planType: 'pro',
      subscriptionEndsAt: new Date('2025-10-31'),
      whatsappNumber: '+91-9820054321',
      language: 'hinglish',
      totalCalls: 183,
      totalBookings: 62,
      isActive: true,
    },
  });

  const clinic3 = await db.clinic.create({
    data: {
      name: 'Patel Skin & Hair Clinic',
      doctorName: 'Dr. Amit Patel',
      slug: 'patel-skin',
      phone: '+91-9830067890',
      email: 'patel.skin@gmail.com',
      address: '56, CG Road, Navrangpura',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380009',
      sipNumber: '+91-79-45678903',
      sipId: 'VOB-SIP-003',
      escalationNumber: '+91-9830067890',
      businessHours: '09:30-18:30',
      businessDays: 'Mon-Fri',
      services: JSON.stringify(['Skin Consultation', 'Hair Treatment', 'Acne Treatment', 'Laser Hair Removal', 'Anti-Aging', 'PRP Therapy']),
      consultationFee: '1200',
      status: 'trial',
      planType: 'starter',
      trialEndsAt: new Date(today.getTime() + 7 * 86400000),
      whatsappNumber: '+91-9830067890',
      language: 'hinglish',
      totalCalls: 34,
      totalBookings: 11,
      isActive: true,
    },
  });

  const clinic4 = await db.clinic.create({
    data: {
      name: 'Reddy Orthopedic Center',
      doctorName: 'Dr. Venkatesh Reddy',
      slug: 'reddy-ortho',
      phone: '+91-9840078901',
      email: 'reddy.ortho@gmail.com',
      address: '78, Jubilee Hills, Road No. 36',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      sipNumber: '+91-40-45678904',
      sipId: 'VOB-SIP-004',
      escalationNumber: '+91-9840078901',
      businessHours: '08:00-17:00',
      businessDays: 'Mon-Sat',
      services: JSON.stringify(['Joint Pain Treatment', 'Fracture Care', 'Knee Replacement', 'Spine Surgery', 'Sports Injury', 'Physiotherapy']),
      consultationFee: '1000',
      status: 'active',
      planType: 'enterprise',
      subscriptionEndsAt: new Date('2026-03-31'),
      whatsappNumber: '+91-9840078901',
      language: 'hinglish',
      totalCalls: 312,
      totalBookings: 124,
      isActive: true,
    },
  });

  const clinic5 = await db.clinic.create({
    data: {
      name: 'Gupta Homeopathy Clinic',
      doctorName: 'Dr. Sneha Gupta',
      slug: 'gupta-homeopathy',
      phone: '+91-9850089012',
      email: 'gupta.homeo@gmail.com',
      address: '23, Park Street, Hazra Road',
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700019',
      sipNumber: '+91-33-45678905',
      sipId: 'VOB-SIP-005',
      escalationNumber: '+91-9850089012',
      businessHours: '10:00-16:00',
      businessDays: 'Mon-Fri',
      services: JSON.stringify(['Homeopathic Consultation', 'Chronic Disease Treatment', 'Allergy Treatment', 'Skin Disorders', 'Digestive Issues']),
      consultationFee: '400',
      status: 'overdue',
      planType: 'starter',
      subscriptionEndsAt: new Date('2025-03-15'),
      whatsappNumber: '+91-9850089012',
      language: 'hinglish',
      totalCalls: 89,
      totalBookings: 23,
      isActive: false,
    },
  });

  // =============================================
  // 3. Create Clinic Users
  // =============================================
  const clinicUsers = [
    { email: 'receptionist@sharma-dental.in', name: 'Neha Sharma', clinicId: clinic1.id },
    { email: 'receptionist@agarwal-eye.in', name: 'Meghna Desai', clinicId: clinic2.id },
    { email: 'receptionist@patel-skin.in', name: 'Riya Patel', clinicId: clinic3.id },
    { email: 'receptionist@reddy-ortho.in', name: 'Suresh Kumar', clinicId: clinic4.id },
    { email: 'receptionist@gupta-homeo.in', name: 'Ananya Gupta', clinicId: clinic5.id },
  ];

  for (const u of clinicUsers) {
    await db.user.create({
      data: {
        email: u.email,
        password: clientPassword,
        name: u.name,
        role: 'client',
        clinicId: u.clinicId,
        phone: '+91-9999999999',
        isActive: true,
      },
    });
  }

  // =============================================
  // 4. Create Calls (realistic Indian data)
  // =============================================
  const callsData = [
    // Clinic 1 - Sharma Dental (recent calls)
    {
      clinicId: clinic1.id, callerPhone: '+91-9988123456', callerName: 'Rahul Verma', callerLocation: 'Delhi',
      status: 'completed', duration: 145, startedAt: hoursAgo(1), answeredAt: hoursAgo(1),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Sharma Dental Clinic mein aapka swagat hai! Main Rekha hoon, kaise madad kar sakoon?' },
        { role: 'caller', text: 'Haan, mujhe appointment chahiye cleaning ke liye.' },
        { role: 'ai', text: 'Bilkul Rahul bhai! Kaunse din aapko suitable hoga?' },
        { role: 'caller', text: 'Kal 5 baje theek rahega.' },
        { role: 'ai', text: 'Perfect! Rahul ji, kal 5 baje ka appointment book kar diya hai. Aapka naam aur number note kar liya hai. Kya aur kuch?' },
      ]),
      summary: 'Patient called for teeth cleaning appointment. Booked for tomorrow at 5 PM.',
      sentiment: 'positive', tags: JSON.stringify(['booked']), intent: 'appointment',
    },
    {
      clinicId: clinic1.id, callerPhone: '+91-9988234567', callerName: 'Sunita Devi', callerLocation: 'Noida',
      status: 'completed', duration: 89, startedAt: hoursAgo(3), answeredAt: hoursAgo(3),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Sharma Dental Clinic, namaste!' },
        { role: 'caller', text: 'Root canal treatment kitna charge hota hai?' },
        { role: 'ai', text: 'Sunita ji, root canal treatment ki fees Dr. Sharma ji se consult karne par pata chalegi. Main aapka appointment book kar doon?' },
        { role: 'caller', text: 'Haan, parso 11 baje.' },
        { role: 'ai', text: 'Done! Parso 11 baje ka appointment book ho gaya. Aapka number save kar liya hai.' },
      ]),
      summary: 'Patient inquired about root canal pricing. Booked consultation for day after tomorrow.',
      sentiment: 'neutral', tags: JSON.stringify(['booked', 'faq']), intent: 'appointment',
    },
    {
      clinicId: clinic1.id, callerPhone: '+91-9988345678', callerName: null, callerLocation: 'Gurgaon',
      status: 'missed', duration: 0, startedAt: hoursAgo(2),
      transcript: null, summary: 'Missed call - no answer', sentiment: null, tags: null, intent: null,
    },
    {
      clinicId: clinic1.id, callerPhone: '+91-9988456789', callerName: 'Amit Kumar', callerLocation: 'Delhi',
      status: 'transferred', duration: 210, startedAt: hoursAgo(5), answeredAt: hoursAgo(5),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Sharma Dental Clinic mein aapka swagat hai!' },
        { role: 'caller', text: 'Mere tooth extraction ke baad bahut dard ho raha hai, kya karna chahiye?' },
        { role: 'ai', text: 'Amit ji, main samajh rahi hoon aapko dard ho raha hai. Ek minute, main Dr. Sharma ji ko transfer kar rahi hoon.' },
        { role: 'caller', text: 'Jaldi karo!' },
        { role: 'ai', text: 'Bilkul, transfer ho raha hai. Dr. Sharma abhi aapki help karenge.' },
      ]),
      summary: 'Patient reported severe post-extraction pain. Transferred to doctor immediately.',
      sentiment: 'angry', tags: JSON.stringify(['transferred']), intent: 'emergency',
      transferReason: 'Medical question - post-extraction pain',
    },

    // Clinic 2 - Agarwal Eye Hospital
    {
      clinicId: clinic2.id, callerPhone: '+91-9977123456', callerName: 'Meera Joshi', callerLocation: 'Mumbai',
      status: 'completed', duration: 178, startedAt: hoursAgo(2), answeredAt: hoursAgo(2),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Agarwal Eye Hospital mein aapka swagat hai!' },
        { role: 'caller', text: 'Mujhe LASIK surgery ke baare mein jaanna hai.' },
        { role: 'ai', text: 'Meera ji, LASIK ke liye pehle ek full eye checkup karna padega. Main appointment book kar doon?' },
        { role: 'caller', text: 'Haan, agle Monday 10 baje.' },
        { role: 'ai', text: 'Done! Monday 10 baje ka appointment book ho gaya hai. Aapko ek reminder bhi bhejenge. Kuch aur?' },
      ]),
      summary: 'LASIK surgery inquiry. Booked initial consultation for next Monday.',
      sentiment: 'positive', tags: JSON.stringify(['booked']), intent: 'appointment',
    },
    {
      clinicId: clinic2.id, callerPhone: '+91-9977234567', callerName: 'Suresh Patil', callerLocation: 'Pune',
      status: 'completed', duration: 52, startedAt: hoursAgo(4), answeredAt: hoursAgo(4),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Agarwal Eye Hospital, namaste!' },
        { role: 'caller', text: 'Aapka clinic kidhar hai aur timing kya hai?' },
        { role: 'ai', text: 'Suresh ji, hum Civil Lines, Mumbai mein hain. Monday se Saturday tak 10 baje se 7 baje tak open hain. Kya appointment book karana hai?' },
        { role: 'caller', text: 'Nahi abhi nahi, baad mein call karunga.' },
        { role: 'ai', text: 'Theek hai! Jab bhi aayen, hum yahan hain. Apna khayal rakhein!' },
      ]),
      summary: 'General inquiry about location and timing. No booking.',
      sentiment: 'neutral', tags: JSON.stringify(['faq']), intent: 'general',
    },

    // Clinic 3 - Patel Skin (trial)
    {
      clinicId: clinic3.id, callerPhone: '+91-9966123456', callerName: 'Pooja Shah', callerLocation: 'Ahmedabad',
      status: 'completed', duration: 120, startedAt: hoursAgo(6), answeredAt: hoursAgo(6),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Patel Skin & Hair Clinic mein aapka swagat hai!' },
        { role: 'caller', text: 'Acne treatment ke liye appointment chahiye.' },
        { role: 'ai', text: 'Pooja ji, bilkul! Kaunse date ko aap aana chahein?' },
        { role: 'caller', text: 'Day after tomorrow 3 baje.' },
        { role: 'ai', text: 'Book ho gaya! Day after tomorrow 3 baje. Aapka naam Pooja Shah hai, theek hai?' },
      ]),
      summary: 'Acne treatment booking. Day after tomorrow at 3 PM.',
      sentiment: 'positive', tags: JSON.stringify(['booked']), intent: 'appointment',
    },

    // Clinic 4 - Reddy Orthopedic
    {
      clinicId: clinic4.id, callerPhone: '+91-9955123456', callerName: 'Krishna Murthy', callerLocation: 'Hyderabad',
      status: 'completed', duration: 200, startedAt: hoursAgo(1.5), answeredAt: hoursAgo(1.5),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Reddy Orthopedic Center mein aapka swagat hai!' },
        { role: 'caller', text: 'Mere knee mein bahut pain hai, walking ke liye bhi problem ho rahi hai.' },
        { role: 'ai', text: 'Krishna ji, main samajh rahi hoon. Knee pain ke liye Dr. Reddy se consultation zaroori hai. Main appointment book kar doon?' },
        { role: 'caller', text: 'Haan, jaldi se jaldi.' },
        { role: 'ai', text: 'Aaj hi 3 baje ka slot available hai. Book kar doon?' },
        { role: 'caller', text: 'Haan, perfect.' },
        { role: 'ai', text: 'Done! Aaj 3 baje ka appointment book ho gaya. Aapko WhatsApp par bhi details bhej di hain.' },
      ]),
      summary: 'Knee pain complaint. Booked same-day appointment at 3 PM.',
      sentiment: 'negative', tags: JSON.stringify(['booked']), intent: 'appointment',
    },
    {
      clinicId: clinic4.id, callerPhone: '+91-9955234567', callerName: 'Lakshmi Narayan', callerLocation: 'Secunderabad',
      status: 'completed', duration: 165, startedAt: hoursAgo(8), answeredAt: hoursAgo(8),
      transcript: JSON.stringify([
        { role: 'ai', text: 'Reddy Orthopedic Center, namaste!' },
        { role: 'caller', text: 'Spine surgery ka consultation chahiye mere father ke liye.' },
        { role: 'ai', text: 'Ji bilkul. Patient ka naam aur phone number bata dijiye.' },
        { role: 'caller', text: 'Ramesh Narayan, yeh number hai.' },
        { role: 'ai', text: 'Kal 11 baje ka slot hai. Book kar doon?' },
        { role: 'caller', text: 'Haan.' },
        { role: 'ai', text: 'Book ho gaya! Kal 11 baje. WhatsApp par details bhej di hain.' },
      ]),
      summary: 'Spine surgery consultation for father. Booked for tomorrow 11 AM.',
      sentiment: 'neutral', tags: JSON.stringify(['booked']), intent: 'appointment',
    },

    // Clinic 5 - Gupta Homeopathy (overdue)
    {
      clinicId: clinic5.id, callerPhone: '+91-9944123456', callerName: 'Arup Dutta', callerLocation: 'Kolkata',
      status: 'missed', duration: 0, startedAt: hoursAgo(10),
      transcript: null, summary: 'Missed call - no answer', sentiment: null, tags: null, intent: null,
    },
  ];

  const createdCalls: string[] = [];
  for (const callData of callsData) {
    const call = await db.call.create({
      data: {
        ...callData,
        endedAt: callData.duration > 0 ? new Date(new Date(callData.startedAt).getTime() + callData.duration * 1000).toISOString() : null,
        callSid: `CALL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      },
    });
    createdCalls.push(call.id);
  }

  // =============================================
  // 5. Create Appointments
  // =============================================
  const appointmentsData = [
    { clinicId: clinic1.id, callId: createdCalls[0], patientName: 'Rahul Verma', patientPhone: '+91-9988123456', date: tomorrowStr, time: '17:00', reason: 'Teeth Cleaning', status: 'confirmed', consultationFee: '500' },
    { clinicId: clinic1.id, callId: createdCalls[1], patientName: 'Sunita Devi', patientPhone: '+91-9988234567', date: dayAfterStr, time: '11:00', reason: 'Root Canal Consultation', status: 'pending', consultationFee: '500' },
    { clinicId: clinic2.id, callId: createdCalls[4], patientName: 'Meera Joshi', patientPhone: '+91-9977123456', date: tomorrowStr, time: '10:00', reason: 'LASIK Surgery Consultation', status: 'confirmed', consultationFee: '800' },
    { clinicId: clinic3.id, callId: createdCalls[6], patientName: 'Pooja Shah', patientPhone: '+91-9966123456', date: dayAfterStr, time: '15:00', reason: 'Acne Treatment', status: 'pending', consultationFee: '1200' },
    { clinicId: clinic4.id, callId: createdCalls[7], patientName: 'Krishna Murthy', patientPhone: '+91-9955123456', date: todayStr, time: '15:00', reason: 'Knee Pain Consultation', status: 'confirmed', consultationFee: '1000' },
    { clinicId: clinic4.id, callId: createdCalls[8], patientName: 'Lakshmi Narayan', patientPhone: '+91-9955234567', date: tomorrowStr, time: '11:00', reason: 'Spine Surgery Consultation (Father: Ramesh)', status: 'confirmed', consultationFee: '1000' },
  ];

  for (const apt of appointmentsData) {
    await db.appointment.create({
      data: {
        ...apt,
        whatsappSent: true,
        whatsappSentAt: new Date().toISOString(),
      },
    });
  }

  // Create some historical completed appointments
  const historicalAppts = [
    { clinicId: clinic1.id, patientName: 'Vikram Singh', patientPhone: '+91-9988001001', date: yesterdayStr, time: '09:00', reason: 'Dental Checkup', status: 'completed', consultationFee: '500' },
    { clinicId: clinic1.id, patientName: 'Anita Kumari', patientPhone: '+91-9988001002', date: yesterdayStr, time: '11:30', reason: 'Braces Fitting', status: 'completed', consultationFee: '500' },
    { clinicId: clinic1.id, patientName: 'Rohit Mehra', patientPhone: '+91-9988001003', date: yesterdayStr, time: '14:00', reason: 'Denture Adjustment', status: 'no_show', consultationFee: '500' },
    { clinicId: clinic2.id, patientName: 'Sanjay Kapoor', patientPhone: '+91-9977001001', date: twoDaysAgo, time: '10:00', reason: 'Eye Checkup', status: 'completed', consultationFee: '800' },
    { clinicId: clinic2.id, patientName: 'Tina Mukherjee', patientPhone: '+91-9977001002', date: yesterdayStr, time: '14:30', reason: 'Glaucoma Checkup', status: 'cancelled', consultationFee: '800' },
    { clinicId: clinic4.id, patientName: 'Ravi Teja', patientPhone: '+91-9955001001', date: yesterdayStr, time: '09:00', reason: 'Fracture Follow-up', status: 'completed', consultationFee: '1000' },
    { clinicId: clinic4.id, patientName: 'Divya Reddy', patientPhone: '+91-9955001002', date: twoDaysAgo, time: '16:00', reason: 'Physiotherapy Session', status: 'completed', consultationFee: '1000' },
    { clinicId: clinic4.id, patientName: 'Anand Sharma', patientPhone: '+91-9955001003', date: yesterdayStr, time: '11:00', reason: 'Sports Injury', status: 'completed', consultationFee: '1000' },
  ];

  for (const apt of historicalAppts) {
    await db.appointment.create({
      data: {
        ...apt,
        bookedVia: 'ai',
        whatsappSent: true,
        whatsappSentAt: new Date().toISOString(),
      },
    });
  }

  // =============================================
  // 6. Create Notifications
  // =============================================
  const notifications = [
    { clinicId: clinic1.id, type: 'booking', title: 'New Appointment Booked', message: 'Rahul Verma booked for Teeth Cleaning tomorrow at 5 PM.' },
    { clinicId: clinic1.id, type: 'escalation', title: 'Call Transferred to Doctor', message: 'Amit Kumar reported post-extraction pain. Transferred immediately.' },
    { clinicId: clinic1.id, type: 'missed_call', title: 'Missed Call', message: 'Missed call from +91-9988345678 (Gurgaon).' },
    { clinicId: clinic2.id, type: 'booking', title: 'New Appointment Booked', message: 'Meera Joshi booked LASIK consultation for next Monday.' },
    { clinicId: clinic4.id, type: 'booking', title: 'Same-Day Booking', message: 'Krishna Murthy booked knee consultation for today at 3 PM.' },
    { clinicId: clinic4.id, type: 'booking', title: 'New Appointment Booked', message: 'Spine surgery consultation booked for Lakshmi Narayan\'s father.' },
    { clinicId: clinic5.id, type: 'system', title: 'Subscription Overdue', message: 'Your subscription expired on March 15. Please renew to continue services.' },
  ];

  for (const n of notifications) {
    await db.notification.create({ data: n });
  }

  // =============================================
  // 7. Create Agent Configs (per-clinic)
  // =============================================
  const agentConfigs = [
    {
      clinicId: clinic1.id,
      agentName: 'Rekha',
      agentPersona: 'friendly',
      greetingMessage: 'Sharma Dental Clinic mein aapka swagat hai! Main Rekha hoon, Dr. Sharma ki assistant. Kaise madad kar sakoon?',
      farewellMessage: 'Sharma Dental Clinic ko call karne ke liye dhanyavaad! Aapka din shubh ho!',
      language: 'hinglish',
      voiceGender: 'female',
      voiceSpeed: 'normal',
      speakingRate: 1.0,
      maxCallDuration: 300,
      transferOnFail: true,
      transferNumber: '+91-9810012345',
      escalationPrompt: 'Main Dr. Sharma ji se baat karwa rahi hoon. Kripya thoda wait karein.',
      autoBookSlot: true,
      bookingSlotDuration: 30,
      bookingLeadDays: 7,
      bufferMinutes: 15,
      autoConfirm: true,
      requireConfirmation: true,
      faqJson: JSON.stringify([
        { question: 'Root canal treatment kitna charge hota hai?', answer: 'Root canal ki fees Dr. Sharma ji se consult karne par pata chalegi. Approx ₹3,000 se ₹8,000 tak hoti hai.' },
        { question: 'Aapka clinic ka timing kya hai?', answer: 'Hum Monday se Saturday tak, subah 9 baje se raat 8 baje tak open hain.' },
        { question: 'Teeth whitening mein kitna time lagta hai?', answer: 'Teeth whitening ek hi sitting mein hoti hai, approx 1 ghanta.' },
        { question: 'Kya insurance accepted hai?', answer: 'Haan, hum major dental insurance plans accept karte hain.' },
      ]),
      servicesJson: JSON.stringify(['Dental Checkup', 'Root Canal', 'Teeth Whitening', 'Braces', 'Dentures', 'Cleaning']),
      clinicDescription: 'Sharma Dental Clinic is a leading dental care center in Lajpat Nagar, New Delhi, led by Dr. Rajesh Sharma with 15+ years of experience. We offer comprehensive dental services including cosmetic dentistry, orthodontics, and oral surgery.',
      specializations: JSON.stringify(['Cosmetic Dentistry', 'Orthodontics', 'Endodontics']),
      specialNotes: 'We are closed on national holidays. Emergency dental cases are handled with priority. Parking available in basement.',
      escalationEnabled: true,
      escalationAfter: 120,
      escalationKeywords: 'emergency, severe pain, bleeding, urgent, emergency hai, dard',
      escalationNumber: '+91-9810012345',
      sentimentThreshold: 'negative',
      askForFeedback: true,
      collectPatientInfo: true,
      agentStatus: 'active',
      isActive: true,
      isConfigured: true,
      totalAgentCalls: 247,
      totalAgentBookings: 89,
      avgConversationTime: 145,
    },
    {
      clinicId: clinic2.id,
      agentName: 'Dr. Priya\'s Assistant',
      agentPersona: 'professional',
      greetingMessage: 'Welcome to Agarwal Eye Hospital. How may I assist you today?',
      farewellMessage: 'Thank you for calling Agarwal Eye Hospital. Wishing you good health!',
      language: 'english',
      voiceGender: 'female',
      voiceSpeed: 'normal',
      speakingRate: 1.0,
      maxCallDuration: 360,
      transferOnFail: true,
      transferNumber: '+91-9820054321',
      escalationPrompt: 'I will connect you to our staff. Please hold.',
      autoBookSlot: true,
      bookingSlotDuration: 45,
      bookingLeadDays: 14,
      bufferMinutes: 15,
      autoConfirm: true,
      requireConfirmation: true,
      faqJson: JSON.stringify([
        { question: 'How much does LASIK surgery cost?', answer: 'LASIK surgery starts from ₹25,000 per eye. Exact cost depends on your prescription and the technology used.' },
        { question: 'What are your visiting hours?', answer: 'We are open Monday to Saturday, 10 AM to 7 PM.' },
        { question: 'Do you accept insurance?', answer: 'Yes, we accept most major health insurance plans including Star Health, ICICI Lombard, and HDFC Ergo.' },
      ]),
      servicesJson: JSON.stringify(['Eye Checkup', 'LASIK Surgery', 'Cataract Surgery', 'Glaucoma Treatment', 'Contact Lens Fitting']),
      clinicDescription: 'Agarwal Eye Hospital is a premium eye care facility in Mumbai, specializing in advanced procedures like LASIK, cataract surgery, and glaucoma treatment. Led by Dr. Priya Agarwal with 20+ years experience.',
      specializations: JSON.stringify(['LASIK Surgery', 'Cataract Surgery', 'Retina', 'Cornea']),
      specialNotes: 'Pre-operative fasting required for LASIK patients. Follow-up visits are free for surgical patients.',
      escalationEnabled: true,
      escalationAfter: 90,
      escalationKeywords: 'emergency, vision loss, injury, severe pain',
      escalationNumber: '+91-9820054321',
      sentimentThreshold: 'negative',
      askForFeedback: true,
      collectPatientInfo: true,
      agentStatus: 'active',
      isActive: true,
      isConfigured: true,
      totalAgentCalls: 183,
      totalAgentBookings: 62,
      avgConversationTime: 130,
    },
    {
      clinicId: clinic3.id,
      agentName: 'Patel Clinic AI',
      agentPersona: 'warm',
      greetingMessage: 'Namaste! Patel Skin & Hair Clinic mein aapka swagat hai. Main aapki kaise madad kar sakti hoon?',
      farewellMessage: 'Dhanyavaad! Patel Skin & Hair Clinic se call karne ke liye. Apna khayal rakhein!',
      language: 'hinglish',
      voiceGender: 'female',
      voiceSpeed: 'slow',
      speakingRate: 0.9,
      maxCallDuration: 240,
      transferOnFail: true,
      transferNumber: '+91-9830067890',
      escalationPrompt: 'Main aapko Dr. Patel se connect kar rahi hoon. Kripya rukiye.',
      autoBookSlot: true,
      bookingSlotDuration: 30,
      bookingLeadDays: 7,
      bufferMinutes: 20,
      autoConfirm: false,
      requireConfirmation: true,
      faqJson: JSON.stringify([
        { question: 'Acne treatment ke liye kitna charge hai?', answer: 'Acne treatment ki fees ₹800 se shuru hoti hai. Treatment plan patient ki condition par depend karta hai.' },
        { question: 'Laser hair removal safe hai?', answer: 'Haan bilkul! FDA-approved laser technology use karte hain. Multiple sessions ki zaroorat hoti hai.' },
      ]),
      servicesJson: JSON.stringify(['Skin Consultation', 'Hair Treatment', 'Acne Treatment', 'Laser Hair Removal', 'Anti-Aging', 'PRP Therapy']),
      clinicDescription: 'Patel Skin & Hair Clinic is Ahmedabad\'s premier dermatology clinic offering advanced skin and hair treatments. Dr. Amit Patel specializes in cosmetic dermatology and laser procedures.',
      specializations: JSON.stringify(['Cosmetic Dermatology', 'Laser Procedures', 'PRP Therapy']),
      specialNotes: 'Patch test required before first laser session. Consultation fee adjustable towards treatment.',
      escalationEnabled: true,
      escalationAfter: 150,
      escalationKeywords: 'emergency, allergic reaction, swelling, rash',
      escalationNumber: '+91-9830067890',
      sentimentThreshold: 'neutral',
      askForFeedback: true,
      collectPatientInfo: true,
      agentStatus: 'testing',
      isActive: true,
      isConfigured: true,
      totalAgentCalls: 34,
      totalAgentBookings: 11,
      avgConversationTime: 120,
    },
    {
      clinicId: clinic4.id,
      agentName: 'Reddy Ortho AI',
      agentPersona: 'clinical',
      greetingMessage: 'Reddy Orthopedic Center. How may I assist you with your orthopedic needs?',
      farewellMessage: 'Thank you for calling Reddy Orthopedic Center. Get well soon!',
      language: 'english',
      voiceGender: 'male',
      voiceSpeed: 'normal',
      speakingRate: 1.0,
      maxCallDuration: 300,
      transferOnFail: true,
      transferNumber: '+91-9840078901',
      escalationPrompt: 'I will connect you with our orthopedic team. Please hold.',
      autoBookSlot: true,
      bookingSlotDuration: 30,
      bookingLeadDays: 10,
      bufferMinutes: 15,
      autoConfirm: true,
      requireConfirmation: true,
      faqJson: JSON.stringify([
        { question: 'Do you handle emergency fractures?', answer: 'Yes, we handle emergency orthopedic cases. Please visit our center immediately or we will prioritize your call.' },
        { question: 'What is the consultation fee?', answer: 'Consultation fee is ₹1,000. Follow-up visits within 7 days are charged at ₹500.' },
        { question: 'Do you have MRI facility?', answer: 'Yes, we have an in-house MRI and X-ray facility for quick diagnostics.' },
      ]),
      servicesJson: JSON.stringify(['Joint Pain Treatment', 'Fracture Care', 'Knee Replacement', 'Spine Surgery', 'Sports Injury', 'Physiotherapy']),
      clinicDescription: 'Reddy Orthopedic Center is a leading orthopedic hospital in Jubilee Hills, Hyderabad, led by Dr. Venkatesh Reddy. We specialize in joint replacements, sports medicine, and spine surgery with state-of-the-art facilities.',
      specializations: JSON.stringify(['Joint Replacement', 'Spine Surgery', 'Sports Medicine', 'Arthroscopy']),
      specialNotes: 'Emergency cases get same-day appointments. Bring previous X-rays/MRI reports if available. Post-surgery physiotherapy available in-house.',
      escalationEnabled: true,
      escalationAfter: 60,
      escalationKeywords: 'emergency, severe pain, fracture, bleeding, accident, spinal injury',
      escalationNumber: '+91-9840078901',
      sentimentThreshold: 'negative',
      askForFeedback: false,
      collectPatientInfo: true,
      agentStatus: 'active',
      isActive: true,
      isConfigured: true,
      totalAgentCalls: 312,
      totalAgentBookings: 124,
      avgConversationTime: 165,
    },
    {
      clinicId: clinic5.id,
      agentName: 'Dr. Sneha\'s Assistant',
      agentPersona: 'warm',
      greetingMessage: 'Gupta Homeopathy Clinic mein aapka swagat hai. Kaise madad kar sakti hoon?',
      farewellMessage: 'Dhanyavaad! Gupta Homeopathy Clinic se call karne ke liye. Apna khayal rakhein!',
      language: 'hinglish',
      voiceGender: 'female',
      voiceSpeed: 'slow',
      speakingRate: 0.9,
      maxCallDuration: 300,
      transferOnFail: false,
      transferNumber: '',
      escalationPrompt: 'Main Dr. Sneha Gupta ji se baat karwa rahi hoon. Kripya rukiye.',
      autoBookSlot: true,
      bookingSlotDuration: 45,
      bookingLeadDays: 7,
      bufferMinutes: 15,
      autoConfirm: true,
      requireConfirmation: false,
      faqJson: JSON.stringify([
        { question: 'Homeopathy mein allergies kaise treat hote hain?', answer: 'Homeopathy mein allergies ke liye personalized treatment diya jata hai. Dr. Gupta pehle aapki detailed history lete hain.' },
        { question: 'Consultation fee kya hai?', answer: 'Consultation fee ₹400 hai. Medicine ka kharcha alag hai.' },
      ]),
      servicesJson: JSON.stringify(['Homeopathic Consultation', 'Chronic Disease Treatment', 'Allergy Treatment', 'Skin Disorders', 'Digestive Issues']),
      clinicDescription: 'Gupta Homeopathy Clinic, led by Dr. Sneha Gupta, offers holistic homeopathic treatment for chronic diseases, allergies, skin disorders, and digestive issues in Kolkata.',
      specializations: JSON.stringify(['Chronic Diseases', 'Allergies', 'Skin Disorders', 'Pediatric Homeopathy']),
      specialNotes: 'First consultation takes 30-45 minutes as detailed case history is taken. Follow-ups are shorter.',
      escalationEnabled: false,
      escalationAfter: 180,
      escalationKeywords: '',
      escalationNumber: '',
      sentimentThreshold: 'negative',
      askForFeedback: true,
      collectPatientInfo: true,
      agentStatus: 'draft',
      isActive: false,
      isConfigured: false,
      totalAgentCalls: 89,
      totalAgentBookings: 23,
      avgConversationTime: 110,
    },
  ];

  for (const ac of agentConfigs) {
    await db.agentConfig.create({ data: ac });
  }

  // =============================================
  // 8. Analytics Snapshots
  // =============================================
  const analyticsSnapshots = [
    // Platform-wide daily metrics
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 42 },
    { metricType: 'daily_calls', metricDate: yesterdayStr, metricValue: 38 },
    { metricType: 'daily_calls', metricDate: twoDaysAgo, metricValue: 55 },
    { metricType: 'daily_bookings', metricDate: todayStr, metricValue: 18 },
    { metricType: 'daily_bookings', metricDate: yesterdayStr, metricValue: 15 },
    { metricType: 'daily_bookings', metricDate: twoDaysAgo, metricValue: 22 },
    { metricType: 'active_clinics', metricDate: todayStr, metricValue: 4 },
    // Per-clinic metrics
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 12, clinicId: clinic1.id },
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 8, clinicId: clinic2.id },
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 3, clinicId: clinic3.id },
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 15, clinicId: clinic4.id },
    { metricType: 'daily_calls', metricDate: todayStr, metricValue: 0, clinicId: clinic5.id },
    { metricType: 'daily_calls', metricDate: yesterdayStr, metricValue: 10, clinicId: clinic1.id },
    { metricType: 'daily_calls', metricDate: yesterdayStr, metricValue: 9, clinicId: clinic2.id },
    { metricType: 'daily_calls', metricDate: yesterdayStr, metricValue: 5, clinicId: clinic3.id },
    { metricType: 'daily_calls', metricDate: yesterdayStr, metricValue: 14, clinicId: clinic4.id },
    { metricType: 'daily_calls', metricDate: twoDaysAgo, metricValue: 16, clinicId: clinic1.id },
    { metricType: 'daily_calls', metricDate: twoDaysAgo, metricValue: 12, clinicId: clinic2.id },
    { metricType: 'daily_calls', metricDate: twoDaysAgo, metricValue: 4, clinicId: clinic3.id },
    { metricType: 'daily_calls', metricDate: twoDaysAgo, metricValue: 23, clinicId: clinic4.id },
  ];

  for (const a of analyticsSnapshots) {
    await db.analyticsSnapshot.create({ data: a });
  }

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📋 Created:');
  console.log('  - 1 Super Admin (admin@voiceai.in / admin123)');
  console.log('  - 5 Clinics with various statuses');
  console.log('  - 5 Clinic Users (receptionist@{clinic-slug}.in / clinic123)');
  console.log('  - 9 Calls with transcripts');
  console.log('  - 14 Appointments');
  console.log('  - 7 Notifications');
  console.log('  - 5 AgentConfigs (per-clinic AI agent settings)');
  console.log('  - 21 Analytics Snapshots');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
