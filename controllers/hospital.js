// controllers/hospital.js
const { Hospital } = require("../models");

// ✅ Get all hospitals
exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });

    res.json({ success: true, hospitals });
  } catch (err) {
    console.error("Get hospitals error:", err);
    res.status(500).json({
      message: "Error fetching hospitals",
      error: err.message,
    });
  }
};

// ✅ Get single hospital by ID
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findByPk(req.params.id);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.json({success:true,hospital});
  } catch (err) {
    console.error("Get hospital error:", err);
    res.status(500).json({
      message: "Error fetching hospital",
      error: err.message,
    });
  }
};

// ✅ Create new hospital (Admin only)
exports.createHospital = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      province,
      district,
      sector,
      cell,
      village,
      street,
      latitute,
      longitude,
      facilities = [],
      registration_number,
      is_active = true,
    } = req.body;

    const { normalizePhone } = require('../utils/phone');
    const normalizedPhone = normalizePhone(phone);
    // Defensive numeric coercion for creation as well
    const coerceNumeric = (obj, keyCandidates) => {
      for (const key of keyCandidates) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const v = obj[key];
          if (v === '' || v === null || v === undefined) {
            obj[key] = null;
          } else {
            const n = parseFloat(v);
            obj[key] = Number.isFinite(n) ? n : null;
          }
          break;
        }
      }
    };

    coerceNumeric(req.body, ['latitude', 'latitute']);
    coerceNumeric(req.body, ['longitude']);

    // Parse facilities string to array if needed
    if (typeof facilities === 'string') {
      try {
        const parsed = JSON.parse(facilities);
        if (Array.isArray(parsed)) req.body.facilities = parsed;
      } catch (e) {
        if (facilities.indexOf(',') !== -1) {
          req.body.facilities = facilities.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    const newHospital = await Hospital.create({
      name,
      email,
      phone: normalizedPhone || phone,
      province,
      district,
      sector,
      cell,
      village,
      street,
      latitute,
      longitude,
      facilities,
      registration_number,
      is_active,
    });

    res.status(201).json({
      success: true,
      message: "Hospital created successfully",
      hospital: newHospital,
    });
  } catch (err) {
    console.error("Create hospital error:", err);
    res.status(500).json({
      message: "Error creating hospital",
      error: err.message,
    });
  }
};

// ✅ Update hospital
exports.updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const updated_ata = req.body;

    const hospital = await Hospital.findByPk(id);
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Normalize phone numbers if present
    const { normalizePhone } = require('../utils/phone');
    if (updated_ata.phone) {
      const normalized = normalizePhone(updated_ata.phone);
      updated_ata.phone = normalized || updated_ata.phone;
    }
    if (updated_ata.emergency_phone) {
      const normalized = normalizePhone(updated_ata.emergency_phone);
      updated_ata.emergency_phone = normalized || updated_ata.emergency_phone;
    }

    // Defensive: coerce numeric fields to numbers or null so Sequelize/Postgres
    // does not receive empty strings for DECIMAL columns (avoids invalid input syntax)
    const coerceNumeric = (obj, keyCandidates) => {
      for (const key of keyCandidates) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const v = obj[key];
          // treat empty string or null-like values as null
          if (v === '' || v === null || v === undefined) {
            obj[key] = null;
          } else {
            const n = parseFloat(v);
            obj[key] = Number.isFinite(n) ? n : null;
          }
          break;
        }
      }
    };

    // Accept both correct and misspelled keys (some places use 'latitute')
    coerceNumeric(updated_ata, ['latitude', 'latitute']);
    coerceNumeric(updated_ata, ['longitude']);

    // Parse facilities if it's a JSON string (frontend may send '["CT scan"]')
    if (typeof updated_ata.facilities === 'string') {
      try {
        const parsed = JSON.parse(updated_ata.facilities);
        if (Array.isArray(parsed)) updated_ata.facilities = parsed;
      } catch (e) {
        // Not valid JSON; if comma-separated, convert to array, otherwise leave as-is
        if (updated_ata.facilities.indexOf(',') !== -1) {
          updated_ata.facilities = updated_ata.facilities.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    await hospital.update(updated_ata);

    res.json({
      success: true,
      message: "Hospital updated successfully",
      hospital,
    });
  } catch (err) {
    console.error("Update hospital error:", err);
    res.status(500).json({
      message: "Error updating hospital",
      error: err.message,
    });
  }
};

// ✅ Delete hospital
exports.deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findByPk(id);

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    await hospital.destroy();

    res.json({
      success: true,
      message: "Hospital deleted successfully",
    });
  } catch (err) {
    console.error("Delete hospital error:", err);
    res.status(500).json({
      message: "Error deleting hospital",
      error: err.message,
    });
  }
};
