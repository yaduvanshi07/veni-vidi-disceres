'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Institution = require('../models/Institution');
const Course = require('../models/Course');
const Document = require('../models/Document');
const { DEMO_DOCUMENT_ID } = require('../utils/demoConfig');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-assistant';

const logosDir = path.join(__dirname, '../public/uploads/logos');
if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
}

const institutions = [
    {
        name: 'Indian Institute of Information Technology, Manipur',
        type: 'University',
        description: 'IIIT Senapati Manipur - Institute of National Importance',
        filename: 'iiit_manipur.png',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b8/Indian_Institute_of_Information_Technology%2C_Manipur_logo.png',
        logo: '/uploads/logos/iiit_manipur.png'
    },
    {
        name: 'Indian Institute of Information Technology, Bhagalpur',
        type: 'University',
        description: 'IIIT Bhagalpur - Institute of National Importance',
        filename: 'iiit_bhagalpur.png',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/c/c6/Indian_Institute_of_Information_Technology%2C_Bhagalpur_logo.png',
        logo: '/uploads/logos/iiit_bhagalpur.png'
    },
    {
        name: 'Indian Institute of Technology, Madras',
        type: 'University',
        description: 'IIT Madras - Premier engineering institute in Chennai',
        filename: 'iit_madras.svg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/6/69/IIT_Madras_Logo.svg',
        logo: '/uploads/logos/iit_madras.svg'
    },
    {
        name: 'Indian Institute of Technology, Delhi',
        type: 'University',
        description: 'IIT Delhi - Premier technical institute in New Delhi',
        filename: 'iit_delhi.svg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/f/fd/Indian_Institute_of_Technology_Delhi_Logo.svg',
        logo: '/uploads/logos/iit_delhi.svg'
    },
    {
        name: 'Indian Institute of Technology, Bombay',
        type: 'University',
        description: 'IIT Bombay - Premier research university in Mumbai',
        filename: 'iit_bombay.svg',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/1/1d/Indian_Institute_of_Technology_Bombay_Logo.svg',
        logo: '/uploads/logos/iit_bombay.svg'
    },
    {
        name: 'International Institute of Information Technology, Hyderabad',
        type: 'University',
        description: 'IIIT Hyderabad - Autonomous research university',
        filename: 'iiit_hyderabad.png',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/e/e1/International_Institute_of_Information_Technology%2C_Hyderabad_logo.png',
        logo: '/uploads/logos/iiit_hyderabad.png'
    },
    {
        name: 'Anna University, Chennai',
        type: 'University',
        description: 'Public state university in Tamil Nadu',
        filename: 'anna_univ.png',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/4/4d/Anna_Univ_edu_in.png',
        logo: '/uploads/logos/anna_univ.png'
    },
    {
        name: 'Delhi Technological University',
        type: 'University',
        description: 'Premier state university in Delhi',
        filename: 'dtu.png',
        downloadUrl: 'https://upload.wikimedia.org/wikipedia/en/b/b5/DTU%2C_Delhi_official_logo.png',
        logo: '/uploads/logos/dtu.png'
    }
];

const courses = [
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'CSE (AI & Data Science)', code: 'CSE-AI' },
    { name: 'Electronics & Comm. Engineering', code: 'ECE' },
    { name: 'ECE (VLSI Design)', code: 'ECE-VLSI' }
];

async function ensureLogosDownloaded() {
    const headers = { 'User-Agent': 'DocumentAssistant/1.0 (abhinavyaduvanshi05@gmail.com)' };
    for (const inst of institutions) {
        const filePath = path.join(logosDir, inst.filename);
        if (!fs.existsSync(filePath)) {
            try {
                console.log(`[SEED] Downloading logo for ${inst.name}...`);
                const res = await fetch(inst.downloadUrl, { headers });
                if (res.ok) {
                    const buffer = await res.buffer();
                    fs.writeFileSync(filePath, buffer);
                    console.log(`[SEED] Downloaded and saved ${inst.filename} (${buffer.length} bytes)`);
                } else {
                    console.warn(`[SEED] Could not download logo for ${inst.name}: HTTP ${res.status}`);
                }
            } catch (err) {
                console.warn(`[SEED] Download error for ${inst.filename}:`, err.message);
            }
        }
    }
}

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('[SEED] Connected to MongoDB');

        // 1. Download logos if missing
        await ensureLogosDownloaded();

        // 2. Idempotently seed institutions and update logos to local paths
        for (const instData of institutions) {
            let inst = await Institution.findOne({ name: instData.name });
            if (!inst) {
                inst = await Institution.create({
                    name: instData.name,
                    type: instData.type,
                    description: instData.description,
                    logo: instData.logo,
                    isVerified: true
                });
                console.log(`[SEED] Created Institute: ${inst.name}`);
            } else {
                // Update logo to local static path and update description if needed
                inst.logo = instData.logo;
                if (instData.description) inst.description = instData.description;
                await inst.save();
                console.log(`[SEED] Institute updated with local logo: ${inst.name}`);
            }

            // Create courses for this institute if they don't exist
            for (const courseData of courses) {
                const exists = await Course.findOne({ institutionId: inst._id, code: courseData.code });
                if (!exists) {
                    await Course.create({
                        ...courseData,
                        institutionId: inst._id,
                        semester: 'All',
                        year: 1,
                        isVerified: true
                    });
                    console.log(`  -> Created Course: ${courseData.name} for ${inst.name}`);
                }
            }
        }

        // 3. Mark designated public demo document as isPublicDemo: true
        if (DEMO_DOCUMENT_ID && mongoose.Types.ObjectId.isValid(DEMO_DOCUMENT_ID)) {
            const demoDoc = await Document.findById(DEMO_DOCUMENT_ID);
            if (demoDoc) {
                demoDoc.isPublicDemo = true;
                await demoDoc.save();
                console.log(`[SEED] Configured Public Demo Document: ${demoDoc._id} (${demoDoc.originalName})`);
            } else {
                console.warn(`[SEED] Designated demo document ID ${DEMO_DOCUMENT_ID} not found in database`);
            }
        }

        console.log('[SEED] Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[SEED] Seeding error:', error);
        process.exit(1);
    }
}

seed();
