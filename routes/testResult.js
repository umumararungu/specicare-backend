// routes/testResults.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { TestResult, Appointment, User, Hospital, MedicalTest } = require('../models');
const { sendSMS, sendCustomSMS } = require('../services/sms');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'test-results');
fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({ storage });

// Admin check middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  next();
};

// Get user's test results
router.get('/my', authenticate, async (req, res) => {
  try {
    const testResults = await TestResult.findAll({
      where: { patient_id: req.user.id },
      include: [
        {
          model: Appointment,
          attributes: ['id', 'appointment_date', 'time_slot']
        },
        {
          model: Hospital,
          attributes: ['id', 'name']
        },
        {
          model: MedicalTest,
          attributes: ['id', 'name', 'category']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(testResults);
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({ 
      message: 'Error fetching test results',
      error: error.message 
    });
  }
});

// Get single test result
router.get('/:id', authenticate, async (req, res) => {
  try {
    const testResult = await TestResult.findOne({
      where: { 
        id: req.params.id,
        patient_id: req.user.id 
      },
      include: [
        {
          model: Appointment,
          include: [
            {
              model: Hospital,
              as: 'hospital',
              attributes: ['id', 'name', "province","district","sector","cell","village","street","latitude","longitude"]
            }
          ]
        },
        {
          model: MedicalTest,
          attributes: ['id', 'name', 'category', 'description']
        }
      ]
    });

    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    res.json(testResult);
  } catch (error) {
    console.error('Get test result error:', error);
    res.status(500).json({ 
      message: 'Error fetching test result',
      error: error.message 
    });
  }
});

// Admin: create a test result (attach to appointment/patient/test)
// Accept multipart/form-data with optional files[] attachments
router.post('/', authenticate, requireAdmin, upload.array('files'), async (req, res) => {
  try {
    // For multipart, fields are in req.body as strings. Attempt to parse JSON fields if needed.
    const raw = req.body || {};
    let appointmentId = raw.appointmentId || raw.appointment_id;
    let testId = raw.testId || raw.test_id;
    let patientId = raw.patientId || raw.patient_id;
    let hospitalId = raw.hospitalId || raw.hospital_id;
    const result_type = raw.result_type || raw.resultType || 'mixed';
    let numeric_results = raw.numeric_results || raw.numericResults || [];
    let text_results = raw.text_results || raw.textResults || {};
    const quality_control = raw.quality_control ? tryParseJSON(raw.quality_control) : {};
    const status = raw.status || 'completed';
    const priority = raw.priority || raw.priority || 'routine';
    const metadata = raw.metadata ? tryParseJSON(raw.metadata) : {};

    // If numeric_results or text_results are JSON strings, parse them
    numeric_results = tryParseJSON(numeric_results, numeric_results);
    text_results = tryParseJSON(text_results, text_results);

    // Basic validation
    if (!appointmentId || !testId || !patientId || !hospitalId) {
      return res.status(400).json({ success: false, message: 'appointmentId, testId, patientId and hospitalId are required' });
    }

    // Build files metadata from uploaded files
    let filesMeta = [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      const host = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      filesMeta = req.files.map((f) => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path,
        url: `${host}/uploads/test-results/${f.filename}`,
      }));
    }

    // Create the TestResult
    const newResult = await TestResult.create({
      appointment_id: appointmentId,
      test_id: testId,
      patient_id: patientId,
      hospital_id: hospitalId,
      result_type,
      files: filesMeta,
      numeric_results,
      text_results,
      quality_control,
      status,
      priority,
      metadata,
    });

    // Optionally update appointment status to completed if present
    if (appointmentId) {
      const appt = await Appointment.findByPk(appointmentId);
      if (appt && appt.status !== 'completed') {
        await appt.update({ status: 'completed' });
      }

      // Notify patient via SMS that their test result is available
      try {
        // Fetch patient and include appointment/test/hospital details for message
        const patient = await User.findByPk(patientId);
        const detailedAppt = await Appointment.findByPk(appointmentId, {
          include: [
            { model: MedicalTest, as: 'medicalTest', attributes: ['id', 'name'] },
            { model: Hospital, as: 'hospital', attributes: ['id', 'name'] },
          ],
        });

        const testName = detailedAppt?.medicalTest?.name || '';
        const hospitalName = detailedAppt?.hospital?.name || '';
        const reference = detailedAppt?.reference || detailedAppt?.id || appointmentId;

        const phone = patient?.phone;
        if (phone) {
          const body = `Hello ${patient.name || 'Patient'}, your test results for ${testName} at ${hospitalName} are ready. Please kindly reach out to nearby clinic to view your results or log in to SpeciCare to view them. Reference: ${reference} .Thank you \n \n Muraho ${patient.name || 'Patient'}, turabamenyesha ko ibisubizo by'ibizamini bya ${testName} byafatiwe kubitaro bya ${hospitalName} byamaze kuboneka. Turabasaba kwegera ivuriro ribegereye bakababwira ibisubizo byanyu binyuze kurubuga rwa Specicare. Nimero y'icyo gikorwa: ${reference}. \n Murakoze.`;
          const smsRes = await sendCustomSMS(phone, body);
          if (!smsRes.success) {
            console.error('Failed sending result-ready SMS:', smsRes.error);
          }
        } else {
          console.warn('No phone number available for patient, cannot send SMS notification for test result');
        }
      } catch (smsErr) {
        console.error('Error while attempting to send SMS notification for test result:', smsErr);
      }

      // Record recent activity: test result recorded
      try {
        const { recordActivity } = require('../services/activity');
        await recordActivity({
          patientId: patientId,
          type: 'result_ready',
          title: 'Test result available',
          message: `Test results for appointment ${appointmentId} are available`,
          data: { testResultId: newResult.id, appointmentId, hospitalId, testId },
          channels: ['sms'],
          priority: 'high',
        });
      } catch (actErr) {
        console.error('Failed to record test-result activity:', actErr);
      }
    }

    res.status(201).json({ success: true, testResult: newResult });
  } catch (error) {
    console.error('Create test result error:', error);
    res.status(500).json({ success: false, message: 'Error creating test result', error: error.message });
  }
});

function tryParseJSON(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return fallback !== null ? fallback : value;
  }
}

module.exports = router;

