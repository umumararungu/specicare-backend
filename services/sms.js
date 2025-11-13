const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER; // e.g. +1234567890
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID; // optional alternative

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials are not set. SMS sending will fail until TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are provided.');
}

async function sendSMS(to, appointment = {}, extras = {}) {
  if (!client) {
    return { success: false, error: new Error('Twilio client not configured') };
  }

  if (!to) {
    return { success: false, error: new Error('Recipient phone number not provided') };
  }

  const patientName = extras.patientName || appointment.patient_name || '';
  const testName = appointment.medicalTest?.name || extras.testName || '';
  const hospitalName = appointment.hospital?.name || extras.hospitalName || '';
  const date = appointment.appointment_date || extras.date || '';
  const time = appointment.time_slot || extras.time || '';
  const reference = appointment.reference || appointment.id || '';

  const body = `Hello ${patientName || 'Patient'}, your appointment (${reference}) for ${testName} at ${hospitalName} is confirmed for ${date} ${time}. Thank you. \n \n Muraho ${patientName || 'Patient'}, gahunda yo kufata ikizami cya ${testName} ifite nimero ya (${reference}) kubitaro bya ${hospitalName} kizafatwa kuwa ${date} saa ${time} Yasabwe neza . Murakoze.`;

  try {
    const createParams = {
      body,
      to,
    };

    // Twilio requires either 'from' (a phone number) or 'messagingServiceSid'.
    if (fromNumber) {
      createParams.from = fromNumber;
    } else if (messagingServiceSid) {
      createParams.messagingServiceSid = messagingServiceSid;
    } else {
      const err = new Error("Twilio configuration error: either TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID must be set in environment variables.");
      console.error(err.message);
      return { success: false, error: err };
    }

    const message = await client.messages.create(createParams);
    return { success: true, sid: message.sid, message };
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return { success: false, error };
  }
}

module.exports = {
  sendSMS,
};

// Send a custom SMS body to a recipient. Returns an object with success flag and details/error.
async function sendCustomSMS(to, body) {
  if (!client) {
    return { success: false, error: new Error('Twilio client not configured') };
  }
  if (!to) {
    return { success: false, error: new Error('Recipient phone number not provided') };
  }
  try {
    const createParams = { body, to };
    if (fromNumber) {
      createParams.from = fromNumber;
    } else if (messagingServiceSid) {
      createParams.messagingServiceSid = messagingServiceSid;
    } else {
      const err = new Error("Twilio configuration error: either TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID must be set in environment variables.");
      console.error(err.message);
      return { success: false, error: err };
    }
    const message = await client.messages.create(createParams);
    return { success: true, sid: message.sid, message };
  } catch (error) {
    console.error('Error sending custom SMS via Twilio:', error);
    return { success: false, error };
  }
}

module.exports.sendCustomSMS = sendCustomSMS;
