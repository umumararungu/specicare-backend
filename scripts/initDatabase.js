const { Pool } = require('pg');
require('dotenv').config();

const initPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'specicare' 
});

async function initializeDatabase() {
    let client;
    try {
        client = await initPool.connect();
        console.log('Connected to PostgreSQL server');

        // Create database if it doesn't exist
        await client.query(`
            SELECT 'CREATE DATABASE specicare'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'specicare')
        `);

        console.log('Database "specicare" ensured');

        // Switch to specicare database
        await client.release();
        client = await initPool.connect();

        // Create tables
        await createTables(client);
        await insertSampleData(client);

        console.log('  Database initialization completed successfully');

    } catch (error) {
        console.error('   Database initialization failed:', error);
    } finally {
        if (client) client.release();
        await initPool.end();
    }
}

async function createTables(client) {
    // Users table
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(15) NOT NULL,
            password TEXT NOT NULL,
            insurance_number VARCHAR(50),
            date_of_birth DATE,
            gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
            district VARCHAR(50),
            sector VARCHAR(50),
            cell VARCHAR(50),
            village VARCHAR(50),
            role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'admin', 'hospital_staff')),
            is_active BOOLEAN DEFAULT TRUE,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

        // Hospitals table
    await client.query(`
        CREATE TABLE IF NOT EXISTS hospitals (
            id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            type VARCHAR(50) NOT NULL CHECK (type IN (
                'national_referral', 'provincial', 'district', 
                'private', 'health_center', 'clinic'
            )),
            phone VARCHAR(15) NOT NULL,
            email VARCHAR(100),
            emergency_phone VARCHAR(15),
            province VARCHAR(50) NOT NULL,
            district VARCHAR(50) NOT NULL,
            sector VARCHAR(50) NOT NULL,
            cell VARCHAR(50),
            village VARCHAR(50),
            street VARCHAR(100),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            operating_hours JSONB,
            facilities JSONB,
            insurance_providers JSONB,
            average_rating DECIMAL(3, 2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
            rating_count INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            registration_number VARCHAR(100) UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Medical tests table
    await client.query(`
        CREATE TABLE IF NOT EXISTS medical_tests (
            id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL CHECK (category IN (
                'radiology', 'laboratory', 'cardiology', 'neurology', 
                'pathology', 'endoscopy', 'pulmonology', 'other'
            )),
            subcategory VARCHAR(100),
            hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
            price INTEGER NOT NULL CHECK (price >= 0),
            currency VARCHAR(10) DEFAULT 'RWF',
            duration VARCHAR(50) NOT NULL,
            preparation_instructions TEXT,
            is_insurance_covered BOOLEAN DEFAULT TRUE,
            insurance_co_pay INTEGER DEFAULT 0 CHECK (insurance_co_pay >= 0),
            is_available BOOLEAN DEFAULT TRUE,
            requirements JSONB,
            tags JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);



    // Appointments table
    await client.query(`
        CREATE TABLE IF NOT EXISTS appointments (
            id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
            reference VARCHAR(50) UNIQUE NOT NULL,
            patient_id INTEGER REFERENCES users(id),
            test_id INTEGER NOT NULL REFERENCES medical_tests(id),
            hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
            appointment_date DATE NOT NULL,
            time_slot VARCHAR(10) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
                'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'
            )),
            referring_doctor VARCHAR(100),
            doctor_contact VARCHAR(100),
            urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Test results table
    await client.query(`
    CREATE TABLE IF NOT EXISTS test_results (
        id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
        appointment_id INTEGER NOT NULL REFERENCES appointments(id),
        test_id INTEGER NOT NULL REFERENCES medical_tests(id),
        patient_id INTEGER NOT NULL REFERENCES users(id),
        hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
        numeric_value VARCHAR(255),
        text_results TEXT,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
        files JSONB,
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'verified')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    // Notifications table
    await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id uuid DEFAULT uuid_generate_v4 () PRIMARY KEY,
            patient_id INTEGER NOT NULL REFERENCES users(id),
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB,
            channels VARCHAR[] NOT NULL, -- or TEXT[] for notification channels
            delivery_status VARCHAR(20) DEFAULT 'pending',
            read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMP,
            priority VARCHAR(20) DEFAULT 'medium',
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('  All tables created successfully');
}

async function insertSampleData(client) {
    // Check if sample data already exists
    const testCount = await client.query('SELECT COUNT(*) FROM medical_tests');
    
    if (parseInt(testCount.rows[0].count) === 0) {
        console.log('Inserting sample data...');


        // Insert sample hospitals
        const sampleHospitals = [
            ['Kigali Central Hospital', 'national_referral', '+250788111111', 'info@kch.rw', '+250788111112', 'Kigali', 'Nyarugenge', 'Nyamirambo'],
            ['King Faisal Hospital', 'private', '+250788222222', 'info@kfh.rw', '+250788222223', 'Kigali', 'Kicukiro', 'Gikondo'],
            ['Bugesera District Hospital', 'district', '+250788333333', 'info@bugesarahospital.rw', '+250788333333', 'Eastern', 'Bugesera', 'Nyamata'],
            ['Muhanga District Hospital', 'district', '+250788444444', 'info@muhangahospital.rw', '+250788333333', 'Southern', 'Muhanga', 'Muhanga']
        ];

        for (const hospital of sampleHospitals) {
            await client.query(
                `INSERT INTO hospitals 
                (name, type, phone, email, emergency_phone, province, district, sector) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                hospital
            );
        }

        // Insert sample medical tests
        const sampleTests = [
            ['MRI Scan', 'Magnetic Resonance Imaging for detailed internal body scans', 'radiology', 1, 85000, '45 minutes', 'No food or drink 4 hours before scan', true, 8500],
            ['CT Scan', 'Computed Tomography scan for cross-sectional body images', 'radiology', 2, 75000, '30 minutes', 'No metal objects, fasting may be required', true, 7500],
            ['Blood Test (Full Panel)', 'Complete blood count and comprehensive metabolic panel', 3, 'laboratory', 15000, '15 minutes', 'Fasting for 8-12 hours required', true, 1500],
            ['X-Ray Chest', 'Chest X-ray for lung and heart examination', 'radiology', 20000, 4, '20 minutes', 'No special preparation needed', true, 2000],
            ['Ultrasound Abdomen', 'Abdominal ultrasound for organ examination', 'radiology', 2, 35000, '30 minutes', 'Fasting for 6-8 hours required', true, 3500]
        ];

        for (const test of sampleTests) {
            await client.query(
                `INSERT INTO medical_tests 
                (name, description, category, hospital_id, price, duration, preparation_instructions, is_insurance_covered, insurance_co_pay) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                test
            );
        }



        console.log('  Sample data inserted successfully');
    } else {
        console.log('  Sample data already exists');
    }
}

// Run initialization
initializeDatabase();
