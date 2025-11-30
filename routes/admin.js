const express = require("express");
const {
  User,
  Appointment,
  MedicalTest,
  TestResult,
  Hospital,
  Notification,
} = require("../models");
const { sendSMS } = require("../services/sms");
const hospitalController = require("../controllers/hospital");
const { authenticate } = require("../middleware/auth");
const router = express.Router();

// Admin middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// Get admin dashboard stats
router.get("/dashboard/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalBookings = await Appointment.count();
    const totalTests = await MedicalTest.count();
    const totalHospitals = await Hospital.count();

    // Calculate revenue from completed appointments
    const revenueData = await Appointment.findAll({
      include: [
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["price"],
        },
      ],
      where: { status: "completed" },
    });

    const totalRevenue = revenueData.reduce((sum, appointment) => {
      return sum + (appointment.medicalTest?.price || 0);
    }, 0);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBookings,
        totalTests,
        totalHospitals,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
});

// Get all users (for admin)
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      users: users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
});

// Get all appointments (for admin)
router.get("/appointments", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const appointments = await Appointment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "province","district","sector","street"],
        },
        {
          model: MedicalTest,
          as: "medicalTest",
          attributes: ["id", "name", "price", "category", "duration"],
        },
      ],
      order: [
        ["appointment_date", "DESC"],
        ["time_slot", "DESC"],
      ],
    });

    res.json({
      success: true,
      appointments: appointments,
    });
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching appointments",
      error: error.message,
    });
  }
});

// Update appointment status
router.put(
  "/appointments/:id/status",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const appointment = await Appointment.findByPk(id);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      await appointment.update({ status });

      // If appointment is confirmed, send an SMS to the patient and create an in-app notification
      if (status === "confirmed") {
        try {
          const user = await User.findByPk(appointment.patient_id);
          const medicalTest = await MedicalTest.findByPk(appointment.test_id);
          const hospitalObj = await Hospital.findByPk(appointment.hospital_id);

          const apptPayload = {
            ...appointment.get ? appointment.get({ plain: true }) : appointment,
            medicalTest: medicalTest ? medicalTest.get({ plain: true }) : null,
            hospital: hospitalObj ? hospitalObj.get({ plain: true }) : null,
          };
          // Send SMS if phone exists
          let smsResult = { success: false };
          try {
            if (user && user.phone) {
              const { normalizePhone } = require('../utils/phone');
              const to = normalizePhone(user.phone);
              if (to) {
                smsResult = await sendSMS(to, apptPayload, {
                patientName: user.name,
                testName: medicalTest?.name,
                hospitalName: hospitalObj?.name,
                date: appointment.appointment_date,
                time: appointment.time_slot,
                });
              } else {
                console.warn('User phone number could not be normalized, skipping SMS:', user.phone);
              }
            }
          } catch (smsErr) {
            console.error('SMS send error:', smsErr);
            smsResult = { success: false, error: smsErr };
          }

          // Record notification in database
          if (Notification) {
            await Notification.create({
              patientId: user.id,
              type: 'appointment_confirmation',
              title: 'Appointment confirmed',
              message: `Your appointment ${appointment.reference || appointment.id} has been confirmed for ${appointment.appointment_date}`,
              data: { appointmentId: appointment.id },
              channels: ['sms', 'in_app'],
              delivery_status: { sms: { sent: !!smsResult.success, info: smsResult.sid || null } },
              priority: 'high',
            });
          }
        } catch (err) {
          console.error('Error sending confirmation SMS or creating notification:', err);
          // don't fail the whole request if email/notification fails
        }
      }

      res.json({
        success: true,
        message: `Appointment ${status} successfully`,
        appointment: appointment,
      });
    } catch (error) {
      console.error("Update appointment error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating appointment",
        error: error.message,
      });
    }
  }
);

// Get all medical tests (for admin)
router.get("/medical-test", authenticate, requireAdmin, async (req, res) => {
  try {
    const tests = await MedicalTest.findAll({
      order: [["name", "ASC"]],
    });

    res.json({
      success: true,
      tests: tests,
    });
  } catch (error) {
    console.error("Get medical tests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching medical tests",
      error: error.message,
    });
  }
});

// Create new medical test
router.post("/medical-test", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      subcategory,
      hospital_id,
      price,
      currency = "RWF",
      duration,
      preparation_instructions,
      is_insurance_covered = true,
      insurance_co_pay = 0,
      is_available = true,
      requirements = [],
      tags = [],
    } = req.body;

    const test = await MedicalTest.create({
      name,
      description,
      category,
      subcategory,
      hospital_id,
      price: parseFloat(price),
      currency,
      duration,
      preparation_instructions,
      is_insurance_covered,
      insurance_co_pay: parseFloat(insurance_co_pay),
      is_available,
      requirements,
      tags,
    });

    res.status(201).json({
      success: true,
      message: "Medical test created successfully",
      test: test,
    });
  } catch (error) {
    console.error("Create medical test error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating medical test",
      error: error.message,
    });
  }
});

// Update medical test
router.put(
  "/medical-test/:id",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updated_ata = req.body;

      const test = await MedicalTest.findByPk(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: "Medical test not found",
        });
      }

      await test.update(updated_ata);

      res.json({
        success: true,
        message: "Medical test updated successfully",
        test: test,
      });
    } catch (error) {
      console.error("Update medical test error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating medical test",
        error: error.message,
      });
    }
  }
);

// Delete medical test
router.delete(
  "/medical-test/:id",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const test = await MedicalTest.findByPk(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: "Medical test not found",
        });
      }

      await test.destroy();

      res.json({
        success: true,
        message: "Medical test deleted successfully",
      });
    } catch (error) {
      console.error("Delete medical test error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting medical test",
        error: error.message,
      });
    }
  }
);

// Delete user (admin only)
router.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
});

// Get all hospitals (for admin)
router.post(
  "/hospitals",
  authenticate,
  requireAdmin,
  hospitalController.createHospital
);

// Update a hospital
router.put(
  "/hospitals/:id",
  authenticate,
  requireAdmin,
  hospitalController.updateHospital
);

// Delete a hospital
router.delete(
  "/hospitals/:id",
  authenticate,
  requireAdmin,
  hospitalController.deleteHospital
);

module.exports = router;
