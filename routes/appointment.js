// routes/appointments.js
const express = require("express");
const { Appointment, User, Hospital, MedicalTest, sequelize} = require("../models");
const { Op } = require('sequelize');
const { authenticate } = require("../middleware/auth");
const { generateAppointmentReference } = require("../middleware/sequenceGenerator"); // Add this import
const router = express.Router();

// Get user's appointments
router.get("/my", authenticate, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { patient_id: req.user.id },
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "province","district","sector","cell","village","street","latitude","longitude"],
        },
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["id", "name", "category", "price", "duration"],
        },
      ],
      order: [
        ["appointment_date", "DESC"],
        ["time_slot", "DESC"],
      ],
    });

    res.json(appointments);
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
});

// Get available time slots for a hospital on a given date
router.get('/availability', authenticate, async (req, res) => {
  try {
    const { hospital_id, date, duration } = req.query;
    if (!hospital_id || !date) {
      return res.status(400).json({ success: false, message: 'hospital_id and date are required' });
    }

    // Parse duration or use default
    const DEFAULT_DURATION_MINUTES = 45;
    const dur = Number(duration) || DEFAULT_DURATION_MINUTES;

    // Working hours from env or defaults
    const opens = process.env.BUSINESS_OPEN || '08:00';
    const closes = process.env.BUSINESS_CLOSE || '17:00';

    const [oh, om] = opens.split(':').map(Number);
    const [ch, cm] = closes.split(':').map(Number);
    const startMinutes = oh * 60 + om;
    const endMinutes = ch * 60 + cm;

    // Fetch existing appointments for that hospital/date, excluding cancelled
    const existing = await Appointment.findAll({
      where: { hospital_id, appointment_date: date, status: { [Op.ne]: 'cancelled' } },
      include: [{ model: MedicalTest, as: 'medicalTest', attributes: ['duration'] }],
    });

    // Build occupied intervals
    const occupied = existing.map((ex) => {
      const t = ex.time_slot;
      if (!/^\d{1,2}:\d{2}$/.test(String(t))) return null;
      const [eh, em] = String(t).split(':').map(Number);
      const s = eh * 60 + em;
      const d = Number(ex.medicalTest?.duration) || DEFAULT_DURATION_MINUTES;
      return { start: s, end: s + d };
    }).filter(Boolean);

    // Generate candidate slots every 15 minutes
    const STEP = 15;
    const slots = [];
    for (let m = startMinutes; m + dur <= endMinutes; m += STEP) {
      const candidateStart = m;
      const candidateEnd = m + dur;
      // Check overlap
      const overlaps = occupied.some(o => (candidateStart < o.end && candidateEnd > o.start));
      if (!overlaps) {
        const hh = Math.floor(candidateStart / 60).toString().padStart(2, '0');
        const mm = (candidateStart % 60).toString().padStart(2, '0');
        slots.push(`${hh}:${mm}`);
      }
    }

    return res.json({ success: true, slots, opens, closes });
  } catch (error) {
    console.error('Availability error:', error);
    return res.status(500).json({ success: false, message: 'Error computing availability' });
  }
});

// Create new appointment
router.post("/", authenticate, async (req, res) => {
  const transaction = await sequelize.transaction(); // Add transaction
  // Debug: log incoming payload and user for easier diagnosis when a rollback occurs
  try {
    console.debug("Create appointment start - user:", req.user?.id, "payload:", req.body);
  } catch (err) {
    // swallow debug errors
    console.debug("Create appointment - failed to log payload", err && err.message);
  }
  
  try {
    const {
      hospital_id,
      test_id,
      appointment_date,
      time_slot,
    } = req.body;

    // Validate required fields
    if (!hospital_id || !test_id || !appointment_date || !time_slot) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Hospital, test, date, and time are required",
      });
    }

    // Generate unique reference
    const reference = await generateAppointmentReference();

    // Normalize patient phone for storage
    const { normalizePhone } = require('../utils/phone');
    const normalizedPatientPhone = normalizePhone(req.user.phone) || req.user.phone;

    // --- Availability and scheduling rules ---
    // Allowed weekdays (comma-separated names) configurable via env
    // Default to Monday and Thursday if not set.
    const allowedDaysEnv = process.env.AVAILABLE_TEST_DAYS || 'Monday,Thursday';
    const allowedDays = allowedDaysEnv.split(',').map(d => d.trim().toLowerCase());

    // Validate appointment_date and time_slot format
    const dateStr = appointment_date; // expected YYYY-MM-DD
    const timeStr = time_slot; // expected HH:MM (24-hour)

    // Basic parse checks
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid appointment_date format. Use YYYY-MM-DD.' });
    }
    if (!/^\d{1,2}:\d{2}$/.test(String(timeStr))) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid time_slot format. Use HH:MM (24-hour).' });
    }

    // Create a Date object for weekday calculation and minutes
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(dateTime.getTime())) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Invalid appointment date/time.' });
    }

    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const weekdayName = dayNames[dateTime.getDay()];

    // Must be Mon-Fri
    if (weekdayName === 'saturday' || weekdayName === 'sunday') {
      await transaction.rollback();
      return res.status(400).json({ message: 'Appointments can only be scheduled Monday to Friday.' });
    }

    // Must be one of the allowed days (two days/week configuration)
    if (!allowedDays.includes(weekdayName)) {
      await transaction.rollback();
      return res.status(400).json({ message: `This test is only available on: ${allowedDaysEnv}.` });
    }

    // Working hours 08:00 - 17:00 (inclusive start, exclusive end at 17:00)
    const [hh, mm] = timeStr.split(':').map(Number);
    const minutes = hh * 60 + mm;
    const opens = 8 * 60; // 08:00
    const closes = 17 * 60; // 17:00
    if (minutes < opens || minutes >= closes) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Appointments must be between 08:00 and 17:00.' });
    }

    // Use medical test duration to calculate appointment end time. If missing, default to 45 minutes.
    const DEFAULT_DURATION_MINUTES = 45;
    const testObj = await MedicalTest.findByPk(test_id, { transaction });
    const durationMinutes = Number(testObj?.duration) || DEFAULT_DURATION_MINUTES;
    const apptStart = minutes;
    const apptEnd = apptStart + durationMinutes;

    // Find existing appointments at this hospital on the same date (excluding cancelled)
    const existing = await Appointment.findAll({
      where: { hospital_id, appointment_date: dateStr, status: { [Op.ne]: 'cancelled' } },
      include: [
        {
          model: MedicalTest,
          as: 'medicalTest',
          attributes: ['id', 'duration'],
        },
      ],
      transaction,
    });

    for (const ex of existing) {
      const exTime = ex.time_slot;
      if (!/^\d{1,2}:\d{2}$/.test(String(exTime))) continue; // skip unknown formats
      const [eh, em] = String(exTime).split(':').map(Number);
      const exStart = eh * 60 + em;
      const exDuration = Number(ex.medicalTest?.duration) || DEFAULT_DURATION_MINUTES;
      const exEnd = exStart + exDuration;

      // Check overlap: start < exEnd && end > exStart
      if (apptStart < exEnd && apptEnd > exStart) {
        await transaction.rollback();
        return res.status(409).json({ message: `Selected time overlaps with another appointment at this hospital. Please choose a different time.` });
      }
    }



    // Create appointment with reference
    const appointment = await Appointment.create({
      reference, // Add reference field
      patient_id: req.user.id,
      hospital_id: hospital_id,
      test_id: test_id,
      appointment_date: appointment_date,
      time_slot: time_slot,
      status: "pending",
      // Add other required fields with defaults
      total_amount: 0, // You'll need to calculate this based on test price
      insurance_covered: 0,
      patient_share: 0,
      patient_name: req.user.name, // Assuming user has name field
      patient_phone: normalizedPatientPhone, // normalized
    }, { transaction });

    // Fetch appointment with related data
    const newAppointment = await Appointment.findByPk(appointment.id, {
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "province","district","sector","cell","village","street","latitude","longitude"],
        },
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["id", "name", "category", "price", "duration"],
        },
      ],
      transaction,
    });

    await transaction.commit(); // Commit transaction
    
    res.status(201).json(newAppointment);
  } catch (error) {
    await transaction.rollback(); // Rollback on error
    // Log error message and stack to help trace the root cause
    console.error("Create appointment error:", error && error.message);
    if (error && error.stack) console.error(error.stack);
    
    // Handle unique constraint violation for reference
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        message: "Duplicate reference generated. Please try again.",
        error: error.message,
      });
    }
    
    res.status(500).json({
      message: "Error creating appointment",
      error: error.message,
    });
  }
});

// Get single appointment
router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: {
        id: req.params.id,
        patient_id: req.user.id,
      },
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "province","district","sector","cell","village","street","latitude","longitude"],
        },
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["id", "name", "category", "price", "duration"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json({
      message: "Error fetching appointment",
      error: error.message,
    });
  }
});

// Add new route to get appointment by reference
router.get("/reference/:reference", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: {
        reference: req.params.reference,
        patient_id: req.user.id,
      },
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "province","district","sector","cell","village","street","latitude","longitude"],
        },
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["id", "name", "category", "price", "duration"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (error) {
    console.error("Get appointment by reference error:", error);
    res.status(500).json({
      message: "Error fetching appointment",
      error: error.message,
    });
  }
});

module.exports = router;