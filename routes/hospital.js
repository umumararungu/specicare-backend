const express = require("express");
// const { MedicalTest } = require('../models');
const hospitalController = require("../controllers/hospital");
const router = express.Router();

router.get("/", hospitalController.getAllHospitals);
router.get("/:id", hospitalController.getHospitalById);

module.exports = router;
