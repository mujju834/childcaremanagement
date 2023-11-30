// routes/: All the route handlers are organized in this folder. The users.js file contains routes related to user operations, like registration.

const express = require('express');
const bcrypt = require('bcryptjs');
const { User,Child,Staff,Facility,TuitionFee,TotalHours } = require('../../models/User');
const router = express.Router();
const cron = require('node-cron');

// Scheduled task to reset attendance at midnight (00:00) every day
cron.schedule('0 0 * * *', async () => {
    try {
        // Reset children's attendance
        await Child.updateMany({}, { $unset: { attendance: "" } });

        // Reset staff's attendance
        await Staff.updateMany({}, { $unset: { attendance: "" } });

        console.log('Attendance has been reset for all children and staff.');
    } catch (error) {
        console.error('Error resetting attendance:', error);
    }
}, {
    scheduled: true,
    timezone: "America/New_York"
});


//  user registration   for sample purpose
// router.post('/register', async (req, res) => {
//     try {
//         const { role, email, password, childInfo, qualifications, adminCode } = req.body;

//         // Check if user already exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(400).send({ message: 'Email already registered' });
//         }

//         // For simplicity, let's assume your secret admin code is 'SECRET123'.
//         if (role === 'admin' && adminCode !== 'SECRET123') {
//             return res.status(400).send({ message: 'Invalid admin registration code' });
//         }

//         // Log the original password
//         console.log("Original password:", password);

//         // Hash the password
//         // const salt = await bcrypt.genSalt(10);
//         // const hashedPassword = await bcrypt.hash(password, salt);

//         // // Log the hashed password
//         // console.log("Hashed password:", hashedPassword);

//         // Create a new user with role-based fields
//         const user = new User({
//             role,
//             email,
//             password: password, // Store the normal password
//             childInfo: role === 'parent' ? childInfo : undefined,
//             qualifications: role === 'teacher' ? qualifications : undefined
//         });

//         await user.save();
//         if (role === 'admin') {
//             return res.status(201).send({ message: 'Admin registered successfully', isAdmin: true });
//         } else {
//             return res.status(201).send({ message: 'User registered successfully', isAdmin: false });
//         }

//     } catch (error) {
//         console.error("Server error:", error);
//         res.status(500).send({ message: 'Server error' });
//     }
// });
router.post('/register', async (req, res) => {
    try {
        const { role, email, password, childInfo, qualifications, adminCode, facilityName, facilityLicenseNumber, phone } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send({ message: 'Email already registered' });
        }

        if (role === 'admin' && adminCode !== 'SECRET123') {
            return res.status(400).send({ message: 'Invalid admin registration code' });
        }

        if (role === 'facilityadmin') {
            const facility = await Facility.findOne({ name: facilityName, licenseNumber: facilityLicenseNumber });
            if (!facility) {
                return res.status(400).send({ message: 'Facility not registered or license number does not match' });
            }
        }

        // Check for teacher registered by facility admin
        if (role === 'teacher') {
            const staffMember = await Staff.findOne({ email: email });
            if (!staffMember) {
                return res.status(400).send({ message: 'Teacher not registered by facility admin' });
            }
        }

        const user = new User({
            role,
            email,
            password, // Storing the plaintext password (not recommended for production)
            childInfo: role === 'parent' ? childInfo : undefined,
            qualifications: role === 'teacher' ? qualifications : undefined
        });

        await user.save();
        
        res.status(201).send({ 
            message: 'User registered successfully', 
            isAdmin: role === 'admin',
            isTeacher: role === 'teacher', 
            isParent: role === 'parent',
            isFacilityAdmin: role === 'facilityadmin'
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});










// user login
router.post('/login', async(req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    console.log('Received:', { email, password });  // Logging the received data
    console.log('User:', user);  // Logging the fetched user object

    try {
        if (!user) {
            return res.status(401).json({ message: "Email not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Stored password:', user.password);  // Logging the stored password
        console.log('Is password valid:', isPasswordValid);  // Logging the result of the comparison

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password doesn\'t match' });
        }

        // Here you can also generate a JWT or some other token for authentication if you wish

        const isAdmin = user.role === 'admin';
        const isTeacher=user.role === 'teacher';
        const isParent= user.role ==='parent';
        const isFacilityAdmin = user.role === 'facilityadmin';

    console.log('Login successful');
    res.status(200).send({ message: 'Login successful', isAdmin, user ,isTeacher,isParent,isFacilityAdmin: isFacilityAdmin });;  // Note: changed 'User' to 'user'

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send({ message: 'Server error' });
    }
});

//backend logic for forgot password
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        res.status(200).send({ exists: !!user });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' });
    }
});

// logic for reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: 'User not found' });
        }
        user.password = password; // You should hash the password before saving
        await user.save();
        res.status(200).send({ message: 'Password updated successfully! You can now log in.' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Server error' });
    }
});

// add child route
router.post('/add-child', async (req, res) => {
    try {
        const { childName, dob, grade, parentEmail, contactNumber, address,age } = req.body;

        // Check if parent exists
        const parent = await User.findOne({ email: parentEmail });
        if (!parent || parent.role !== 'parent') {
            return res.status(400).send({ message: 'Parent not found' });
        }

        // Create a new child record
        const newChild = new Child({
            childName, dob, grade, parentEmail, contactNumber, address, age
        });

        // Save the child to the database
        await newChild.save();

        res.status(201).send({ message: 'Child added successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});


router.get('/retrieve-children', async (req, res) => {
    try {
        const children = await Child.find({});
        res.status(200).json(children);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});

// Route to delete a child by ID
router.delete('/delete-child/:childId', async (req, res) => {
    try {
        const { childId } = req.params;
        await Child.findByIdAndDelete(childId);
        res.status(200).send({ message: 'Child deleted successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});

// Route to waitlist a child
router.put('/waitlist-child/:childId', async (req, res) => {
    try {
        const { childId } = req.params;
        await Child.findByIdAndUpdate(childId, { waitlisted: true });
        res.status(200).send({ message: 'Child waitlisted successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});


// Route to remove a child from the waitlist
router.put('/remove-waitlist-child/:childId', async (req, res) => {
    try {
        const { childId } = req.params;
        await Child.findByIdAndUpdate(childId, { waitlisted: false });
        res.status(200).send({ message: 'Child removed from waitlist successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});


router.post('/add-staff', async (req, res) => {
    try {
        const newStaff = new Staff(req.body);
        await newStaff.save();
        res.status(201).send({ message: 'Staff member added successfully' });
    } catch (error) {
        console.error("Error adding staff:", error);
        res.status(500).send({ message: 'Failed to add staff' });
    }
});


// Fetch all staff members
router.get('/retrieve-staff', async (req, res) => {
    try {
        const staffMembers = await Staff.find({});
        res.status(200).json(staffMembers);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Failed to retrieve staff' });
    }
});

// Delete a staff member by name
router.delete('/delete-staff/:staffId', async (req, res) => {
    try {
        const { staffId } = req.params;
        const staff = await Staff.findByIdAndDelete(staffId);
        if (!staff) {
            return res.status(404).send({ message: 'Staff member not found' });
        }
        res.status(200).send({ message: 'Staff member deleted successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Failed to delete staff member' });
    }
});




// Route to add a new facility
router.post('/add-facility', async (req, res) => {
    try {
        const { name, licenseNumber } = req.body;
        
        // Check if the facility already exists
        const existingFacility = await Facility.findOne({ name, licenseNumber });
        if (existingFacility) {
            return res.status(400).send({ message: 'Facility with this name and license number already exists' });
        }

        // Create a new facility
        const newFacility = new Facility({ name, licenseNumber });
        await newFacility.save();

        res.status(201).send({ message: 'Facility added successfully', facility: newFacility });
    } catch (error) {
        console.error("Error adding facility:", error);
        res.status(500).send({ message: 'Failed to add facility' });
    }
});


// api to fetch all facilites
router.get('/facilities', async (req, res) => {
    try {
        const facilities = await Facility.find({});
        res.status(200).json(facilities);
    } catch (error) {
        console.error("Error retrieving facilities:", error);
        res.status(500).send({ message: 'Failed to retrieve facilities' });
    }
});


// api to delete all facilities
router.delete('/facility', async (req, res) => {
    try {
        const { name, licenseNumber } = req.body;
        const facility = await Facility.findOneAndDelete({ name, licenseNumber });
        if (!facility) {
            return res.status(404).send({ message: 'Facility with the specified name and license number not found' });
        }
        res.status(200).send({ message: 'Facility deleted successfully' });
    } catch (error) {
        console.error("Error deleting facility:", error);
        res.status(500).send({ message: 'Failed to delete facility' });
    }
});


// assign staff
router.put('/assign-staff', async (req, res) => {
    try {
        const { name, email, assignedClassroom } = req.body;

        // Find the staff member by email (assuming email is unique)
        const staff = await Staff.findOne({ email });
        if (!staff) {
            return res.status(404).send({ message: 'Staff not found' });
        }

        // Update the staff member's assigned classroom
        staff.assignedClassroom = assignedClassroom;
        await staff.save();

        // Send back the updated staff data
        res.status(200).json({ message: 'Staff assigned to classroom successfully', updatedStaff: staff });
    } catch (error) {
        console.error("Error assigning staff to classroom:", error);
        res.status(500).send({ message: 'Failed to assign staff to classroom' });
    }
});


// attendance logic
router.post('/children/attendance', async (req, res) => {
    const { childName, status } = req.body; // Get childName and status from request body

    if (!['present', 'absent'].includes(status)) {
        return res.status(400).send('Invalid attendance status');
    }

    try {
        const child = await Child.findOne({ childName: childName });
        if (!child) {
            return res.status(404).send('Child not found');
        }

        child.attendance = {
            date: new Date(), // Current date
            status: status // 'present' or 'absent'
        };

        await child.save();
        res.send(`Attendance for child marked as ${status}`);
    } catch (error) {
        res.status(500).send('Server error');
    }
});




// for staff
router.post('/staff/attendance', async (req, res) => {
    const { name, status } = req.body; // Get staff name and status from request body

    if (!['present', 'absent'].includes(status)) {
        return res.status(400).send('Invalid attendance status');
    }

    try {
        const staff = await Staff.findOne({ name: name });
        if (!staff) {
            return res.status(404).send('Staff not found');
        }

        staff.attendance = {
            date: new Date(), // Current date
            status: status // 'present' or 'absent'
        };

        await staff.save();
        res.send(`Attendance for staff marked as ${status}`);
    } catch (error) {
        res.status(500).send('Server error');
    }
});



// adding tution fee
router.post('/tuition-fees', async (req, res) => {
    try {
        const fees = req.body;
        const existingFees = await TuitionFee.findOne();
        if (existingFees) {
            // Update existing fees
            await TuitionFee.updateOne({}, fees);
        } else {
            // Create new fees if they don't exist
            const newFees = new TuitionFee(fees);
            await newFees.save();
        }

        res.status(200).send('Tuition fees updated successfully');
    } catch (error) {
        res.status(500).send('Server error: ' + error.message);
    }
});

//collect payment
// In your routes file where '/collect-payment' is defined

router.post('/collect-payment', async (req, res) => {
    try {
        const { childName } = req.body;

        // Find the child by name
        const child = await Child.findOne({ childName });
        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        // Ensure that the age is a number
        if (typeof child.age !== 'number' || isNaN(child.age)) {
            return res.status(400).send({ message: 'Invalid age data for fee calculation' });
        }

        // Calculate the fee based on age
        const fee = determineFee(child.age);

        // Check if fee is a valid number
        if (typeof fee !== 'number' || isNaN(fee)) {
            return res.status(500).send({ message: 'Error calculating fee' });
        }

        // Update the fee due
        child.feeDue = fee;
        await child.save();

        res.status(200).send({ message: 'Fee due updated successfully', feeDue: fee });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});



// Function to determine fee based on age (similar to the frontend logic)
const determineFee = (age) => {
    switch(age) {
        case 0: return 300; // Infant
        case 1: return 275; // Toddler
        case 2: return 250; // Twadler
        case 3: return 225; // 3 Years Old
        case 4: // 4 Years Old and above
        default: return 200; // Default fee for age 4 and above
    }
};

// fee payment
router.post('/pay-fee', async (req, res) => {
    try {
        const { childName } = req.body;

        // Find the child by name
        const child = await Child.findOne({ childName });
        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        // Calculate the fee (this is just an example, replace it with your actual logic)
        const fee = determineFee(child.age);

        // Update the payment status and fee paid
        child.paymentStatus = true;
        child.feePaid = fee;
        await child.save();

        res.status(200).send({ message: 'Fee paid successfully', feePaid: fee });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Payment processing failed' });
    }
});



// weekly attendance
// Example: backend/routes/reportRoutes.js

// ...

// Daily Attendance Report
router.get('/daily-attendance', async (req, res) => {
    try {
        const date = new Date(req.query.date); // Assuming the date is passed as a query parameter

        // Adjust the date range to cover the entire day
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const attendanceData = await Child.aggregate([
            {
                $match: {
                    "attendance.date": { $gte: startOfDay, $lte: endOfDay }
                }
            },
            {
                $group: {
                    _id: "$grade",
                    present: { $sum: { $cond: [{ $eq: ["$attendance.status", "present"] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ["$attendance.status", "absent"] }, 1, 0] } }
                }
            }
        ]);

        res.status(200).json(attendanceData);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});

// ...


// retrive attendance of children
router.get('/retrieve-children-attendance', async (req, res) => {
    try {
        const children = await Child.find({}); // Assuming 'Child' is your Mongoose model for children
        res.status(200).json(children);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send('Failed to retrieve children');
    }
});

// retrieve staff attendance
// retrieve staff attendance based on logged-in teacher's email
router.get('/retrieve-staff-attendance', async (req, res) => {
    const teacherEmail = req.query.email; // Assuming the email is passed as a query parameter

    try {
        // If an email is provided, retrieve attendance for that specific teacher
        if (teacherEmail) {
            const staffMember = await Staff.findOne({ email: teacherEmail });
            if (!staffMember) {
                return res.status(404).send('Staff not found');
            }
            return res.status(200).json(staffMember);
        }

        // If no email is provided, retrieve all staff members (fallback)
        const staffMembers = await Staff.find({});
        res.status(200).json(staffMembers);
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send('Failed to retrieve staff');
    }
});





// Endpoint to handle sign-in
router.post('/sign-in', async (req, res) => {
    const { email } = req.body;
    try {
        const staff = await Staff.findOne({ email });
        if (!staff) {
            return res.status(404).send('Staff not found');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (staff.signInTime && staff.signInTime >= today) {
            // Already signed in today
            return res.status(409).json({ message: 'Already signed in today' });
        }

        const signInTime = new Date();
        staff.signInTime = signInTime;
        await staff.save();

        res.status(200).json({ message: 'Signed in successfully', signInTime });
    } catch (error) {
        res.status(500).send('Server error');
    }
});

router.post('/sign-out', async (req, res) => {
    const { email } = req.body;
    try {
        const staff = await Staff.findOne({ email });
        if (!staff || !staff.signInTime) {
            return res.status(404).send('Staff not found or not signed in');
        }

        const signOutTime = new Date();
        const hoursWorked = (signOutTime - staff.signInTime) / (1000 * 60 * 60); // Calculate hours worked

        staff.signInTime = null; // Reset signInTime
        await staff.save();

        res.status(200).json({ hoursWorked: hoursWorked.toFixed(2) }); // Send hours worked as response
    } catch (error) {
        res.status(500).send('Server error');
    }
});









//total hours worked schema

router.post('/total-hours-worked', async (req, res) => {
    const { email, totalHoursWorked } = req.body;

    try {
        // Create a new record for total hours worked
        const newTotalHours = new TotalHours({
            email,
            totalHoursWorked
        });

        await newTotalHours.save();
        res.status(200).send({ message: 'Total hours worked saved successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Failed to save total hours worked' });
    }
});


// retrieve hours worked
router.get('/total-hours-worked/:email', async (req, res) => {
    const { email } = req.params;

    try {
        const totalHoursData = await TotalHours.find({ email });
        const totalHoursWorked = totalHoursData.reduce((acc, record) => acc + record.totalHoursWorked, 0);
        res.status(200).json({ totalHoursWorked });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Failed to retrieve total hours worked' });
    }
});



// retrieve children in enrollment
router.get('/retrieve-children/:childName', async (req, res) => {
    try {
        const childName = req.params.childName;
        const child = await Child.findOne({ childName: childName });
        if (child) {
            res.status(200).json(child);
        } else {
            res.status(404).send({ message: 'Child not found' });
        }
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});


// in enrollment update a child
router.put('/add-child/:childName', async (req, res) => {
    const { childName } = req.params;
    const updateData = req.body;

    try {
        // Assuming 'childName' is unique for each child.
        // Also assuming you don't want to update the child's name itself.
        let child = await Child.findOne({ childName: childName });

        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        // Update child's details except the 'dob' field
        Object.keys(updateData).forEach(key => {
            if (key !== 'dob') {
                child[key] = updateData[key];
            }
        });

        await child.save();

        res.status(200).send({ message: 'Child updated successfully', updatedChild: child });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});


// update child feepaid from the database
// In your backend (Node.js/Express)
// In your Node.js/Express server
router.post('/update-fee-paid', async (req, res) => {
    try {
        const { childName, feePaid } = req.body;

        const child = await Child.findOne({ childName });
        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        child.feePaid = feePaid; // Set feePaid to the amount received
        await child.save();

        res.status(200).send({ message: 'Fee updated successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Error updating fee' });
    }
});


router.post('/request-withdrawal', async (req, res) => {
    try {
        const { childName } = req.body;

        const child = await Child.findOne({ childName });
        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        child.withdrawalRequestedByParent = true;
        await child.save();

        res.status(200).send({ message: 'Withdrawal request updated successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Error processing withdrawal request' });
    }
});


// approve withdrawal and decline withdrawal
// Endpoint to approve a withdrawal request
router.put('/approve-withdrawal/:childName', async (req, res) => {
    try {
        const { childName } = req.params;
        const child = await Child.findOne({ childName });

        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        child.withdrawalApproved = true;
        child.withdrawalRequestedByParent = false; // Optionally reset the withdrawal request flag
        await child.save();

        res.status(200).send({ message: 'Withdrawal approved successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});

// Endpoint to deny a withdrawal request
router.put('/deny-withdrawal/:childName', async (req, res) => {
    try {
        const { childName } = req.params;
        const child = await Child.findOne({ childName });

        if (!child) {
            return res.status(404).send({ message: 'Child not found' });
        }

        child.withdrawalDeclined = true;
        child.withdrawalRequestedByParent = false; // Optionally reset the withdrawal request flag
        await child.save();

        res.status(200).send({ message: 'Withdrawal denied successfully' });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send({ message: 'Server error' });
    }
});





module.exports = router;
