const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Adjusted path for script
const Institution = require('../models/Institution');
const Course = require('../models/Course');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-assistant';

const institutions = [
    {
        name: 'Indian Institute of Technology, Bombay',
        type: 'University',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/1d/Indian_Institute_of_Technology_Bombay_Logo.svg/1200px-Indian_Institute_of_Technology_Bombay_Logo.svg.png'
    },
    {
        name: 'Anna University, Chennai',
        type: 'University',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Anna_University_Logo.svg/1200px-Anna_University_Logo.svg.png'
    },
    {
        name: 'Delhi Technological University',
        type: 'University',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b5/Delhi_Technological_University_Logo.svg/1200px-Delhi_Technological_University_Logo.svg.png'
    }
];

const courses = [
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'CSE (AI & DS)', code: 'CSE-AI' },
    { name: 'Electronics & Comm. Engineering', code: 'ECE' },
    { name: 'ECE (VLSI Design)', code: 'ECE-VLSI' }
];

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing (optional, maybe safe not to?)
        // Let's just create if not exists

        for (const instData of institutions) {
            let inst = await Institution.findOne({ name: instData.name });
            if (!inst) {
                inst = await Institution.create({ ...instData, isVerified: true });
                console.log(`Created Institute: ${inst.name}`);
            } else {
                console.log(`Institute exists: ${inst.name}`);
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
                    console.log(`  -> Created Course: ${courseData.name}`);
                }
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
