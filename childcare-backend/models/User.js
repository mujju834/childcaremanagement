const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Child Schema
const childSchema = new mongoose.Schema({
    childName: String,
    dob: String,
    grade: String,
    parentEmail: { 
        type: String,
        required: true, 
        trim: true, 
        lowercase: true, // Converts the email to lowercase
    },
    contactNumber: String,
    address: String,
    waitlisted: { type: Boolean, default: false },
    paymentStatus: { type: Boolean, default: false },
    attendance: {
        date: Date,
        status: String // "present" or "absent"
    },
    age: Number,
    feePaid: {
        type: Number,
        default: 0 // You can set a default value if needed
    },
    feeDue: {
        type: Number,
        default: 0 // Default value can be set as per your requirement
    },
    withdrawalRequestedByParent: {
        type: Boolean,
        default: false
    },
    withdrawalApproved: { type: Boolean, default: false },
    withdrawalDeclined: { type: Boolean, default: false }
});



const Child = mongoose.model('Child', childSchema);

// User Schema
const userSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['parent', 'teacher', 'admin', 'facilityadmin'],
        required: true
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Child'
    }],
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    childInfo: {
        type: String,
        required: function() { return this.role === 'parent'; }
    },
    qualifications: {
        type: String,
        required: function() { return this.role === 'teacher'; }
    }
});

userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);

// Staff Schema
const staffSchema = new mongoose.Schema({
    name: String,
    qualifications: String,
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: String,
    assignedClassroom: {
        type: String, // or mongoose.Schema.Types.ObjectId if you reference Classroom model
        default: null // Optional: set default as null if no classroom is assigned initially
    },
    attendance: {
        date: Date,
        status: String // "present" or "absent"
    },
    signInTime: Date
});



const Staff = mongoose.model('Staff', staffSchema);


const facilitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    licenseNumber: { // Changed from 'admin' to 'licenseNumber'
        type: String,
        required: true,
        unique: true // Assuming license numbers are unique
    }
    // Add any other relevant fields
});

const Facility = mongoose.model('Facility', facilitySchema);

// tution fee schema
const tuitionFeeSchema = new mongoose.Schema({
    Infant: Number,
    Toddler: Number,
    Twadler: Number,
    '3YearsOld': Number,
    '4YearsOld': Number
});

const TuitionFee = mongoose.model('TuitionFee', tuitionFeeSchema);

const TotalHoursSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    totalHoursWorked: {
        type: Number,
        required: true,
    }
   
});

const TotalHours = mongoose.model('TotalHours', TotalHoursSchema);



// Exporting models
module.exports = { User, Child, Staff, Facility,TuitionFee,TotalHours };
