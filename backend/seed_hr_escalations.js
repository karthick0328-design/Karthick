const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const bcrypt = require('bcryptjs');

// MongoDB URI
const MONGO_URI = 'mongodb://localhost:27017/biology';

async function seedData() {
    try {
        await mongoose.connect(MONGO_URI, {
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
        });
        console.log('✅ Connected to MongoDB');

        // 1. Create HR Manager
        let hrManager = await User.findOne({ email: 'hr.manager@maduraibioscience.org' });
        if (!hrManager) {
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            hrManager = await User.create({
                name: 'Sarah Johnson',
                email: 'hr.manager@maduraibioscience.org',
                password: hashedPassword,
                role: 'manager',
                department: 'Human Resources',
                branch: 'Chennai Main Branch'
            });
            console.log('✅ Created HR Manager:', hrManager.name);
        } else {
            console.log('✅ HR Manager exists:', hrManager.name);
        }

        // 2. Create Service Manager
        let serviceManager = await User.findOne({ email: 'manager.drugdiscovery@maduraibioscience.org' });
        if (!serviceManager) {
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            serviceManager = await User.create({
                name: 'John Davis',
                email: 'manager.drugdiscovery@maduraibioscience.org',
                password: hashedPassword,
                role: 'manager',
                service: 'Drug Discovery',
                branch: 'Chennai Main Branch'
            });
            console.log('✅ Created Service Manager:', serviceManager.name);
        } else {
            console.log('✅ Service Manager exists:', serviceManager.name);
        }

        // 3. Create Employees
        let employee1 = await User.findOne({ email: 'alice.williams@maduraibioscience.org' });
        if (!employee1) {
            const hashedPassword = await bcrypt.hash(process.env.EMPLOYEE_PASSWORD, 10);
            employee1 = await User.create({
                name: 'Alice Williams',
                email: 'alice.williams@maduraibioscience.org',
                password: hashedPassword,
                role: 'employee',
                service: 'Drug Discovery',
                seniority: 'senior',
                branch: 'Chennai Main Branch'
            });
            console.log('✅ Created Employee 1:', employee1.name);
        }

        let employee2 = await User.findOne({ email: 'bob.martinez@maduraibioscience.org' });
        if (!employee2) {
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            employee2 = await User.create({
                name: 'Bob Martinez',
                email: 'bob.martinez@maduraibioscience.org',
                password: hashedPassword,
                role: 'employee',
                service: 'Microbiology',
                seniority: 'senior',
                branch: 'Chennai Main Branch'
            });
            console.log('✅ Created Employee 2:', employee2.name);
        }

        let employee3 = await User.findOne({ email: 'carol.thompson@maduraibioscience.org' });
        if (!employee3) {
            const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);
            employee3 = await User.create({
                name: 'Carol Thompson',
                email: 'carol.thompson@maduraibioscience.org',
                password: hashedPassword,
                role: 'employee',
                service: 'NGS',
                seniority: 'senior',
                branch: 'Chennai Main Branch'
            });
            console.log('✅ Created Employee 3:', employee3.name);
        }

        // 4. Create Projects with Various Report Statuses
        console.log('\nCreating projects with escalations...');

        // PROJECT 1: Escalated + Resolved + Reviewed reports
        const project1 = new Project({
            userId: employee1._id,
            department: 'Drug Discovery',
            category: 'New Drug Development',
            status: 'In Progress',
            assignedTo: [serviceManager._id],
            reports: [
                {
                    submittedBy: employee1._id,
                    title: 'Lab Safety Concern',
                    content: 'Unsafe working conditions in the lab - chemical spills not properly cleaned.',
                    type: 'Issue',
                    status: 'Escalated to HR',
                    managerRemarks: 'This is a serious safety concern that requires immediate HR intervention.',
                    createdAt: new Date('2024-12-15'),
                    escalatedAt: new Date('2024-12-16')
                },
                {
                    submittedBy: employee1._id,
                    title: 'Safety Training Request',
                    content: 'Request for additional safety training for new lab equipment.',
                    type: 'Other',
                    status: 'Resolved',
                    managerRemarks: 'Training needed for all team members.',
                    hrResponse: 'Safety training session scheduled for January 15th. All team members must attend.',
                    createdAt: new Date('2024-11-20'),
                    escalatedAt: new Date('2024-11-21')
                },
                {
                    submittedBy: employee1._id,
                    title: 'Weekly Progress Update',
                    content: 'Weekly progress report submitted on time.',
                    type: 'Progress',
                    status: 'Reviewed',
                    managerRemarks: 'Good progress this week.',
                    createdAt: new Date('2024-12-01')
                }
            ],
            messages: [
                {
                    senderId: serviceManager._id,
                    content: 'Lab safety is paramount. I am escalating the chemical spill concern to HR immediately.',
                    timestamp: new Date('2024-12-16')
                }
            ]
        });
        await project1.save();
        console.log('✅ Created Project 1:', project1.uniqueId);

        // PROJECT 2: Multiple Escalations + Pending
        const project2 = new Project({
            userId: employee2._id,
            department: 'Clinical Research',
            category: 'Phase II Clinical Trial',
            status: 'In Progress',
            assignedTo: [serviceManager._id],
            reports: [
                {
                    submittedBy: employee2._id,
                    title: 'Harassment Complaint',
                    content: 'Harassment complaint against a senior staff member - inappropriate comments.',
                    type: 'Issue',
                    status: 'Escalated to HR',
                    managerRemarks: 'Zero tolerance policy - immediate HR action required.',
                    createdAt: new Date('2024-12-20'),
                    escalatedAt: new Date('2024-12-20')
                },
                {
                    submittedBy: employee2._id,
                    title: 'Data Handling Concerns',
                    content: 'Concerns about patient data handling practices in our department.',
                    type: 'Issue',
                    status: 'Escalated to HR',
                    managerRemarks: 'Potential HIPAA violation - needs urgent review.',
                    createdAt: new Date('2024-12-18'),
                    escalatedAt: new Date('2024-12-19')
                },
                {
                    submittedBy: employee2._id,
                    title: 'Flexible Hours Request',
                    content: 'Request for flexible working hours due to childcare needs.',
                    type: 'Other',
                    status: 'Pending',
                    managerRemarks: 'Under consideration.',
                    createdAt: new Date('2024-12-10')
                },
                {
                    submittedBy: employee2._id,
                    title: 'Equipment Malfunction',
                    content: 'Equipment malfunction report - centrifuge making unusual noise.',
                    type: 'Issue',
                    status: 'Resolved',
                    managerRemarks: 'Maintenance scheduled.',
                    hrResponse: 'Equipment has been inspected and repaired. Safe to use.',
                    createdAt: new Date('2024-11-15'),
                    escalatedAt: new Date('2024-11-16')
                }
            ],
            messages: [
                {
                    senderId: employee2._id,
                    content: 'I need to report a serious workplace harassment issue.',
                    timestamp: new Date('2024-12-20')
                }
            ]
        });
        await project2.save();
        console.log('✅ Created Project 2:', project2.uniqueId);

        // PROJECT 3: Mix of all statuses
        const project3 = new Project({
            userId: employee3._id,
            department: 'Bioinformatics',
            category: 'Genomic Data Analysis',
            status: 'In Progress',
            assignedTo: [serviceManager._id],
            reports: [
                {
                    submittedBy: employee3._id,
                    title: 'Discrimination Complaint',
                    content: 'Discrimination complaint - being excluded from important meetings.',
                    type: 'Issue',
                    status: 'Escalated to HR',
                    managerRemarks: 'Team dynamics issue requiring HR mediation.',
                    createdAt: new Date('2024-12-22'),
                    escalatedAt: new Date('2024-12-23')
                },
                {
                    submittedBy: employee3._id,
                    title: 'Salary Discrepancy',
                    content: 'Salary discrepancy - noticed unequal pay for similar roles.',
                    type: 'Issue',
                    status: 'Resolved',
                    managerRemarks: 'Compensation review needed.',
                    hrResponse: 'After review, salary has been adjusted to match industry standards.',
                    createdAt: new Date('2024-11-01'),
                    escalatedAt: new Date('2024-11-02')
                },
                {
                    submittedBy: employee3._id,
                    title: 'Extra Vacation Request',
                    content: 'Request for additional vacation days beyond policy.',
                    type: 'Other',
                    status: 'Resolved',
                    managerRemarks: 'Cannot exceed maximum vacation allowance per policy.',
                    hrResponse: 'Request denied. Current vacation balance is at maximum allowed.',
                    createdAt: new Date('2024-10-15'),
                    escalatedAt: new Date('2024-10-16')
                },
                {
                    submittedBy: employee3._id,
                    title: 'Software Suggestion',
                    content: 'Suggestion for new data analysis software.',
                    type: 'Other',
                    status: 'Pending',
                    managerRemarks: 'Will evaluate cost and benefits.',
                    createdAt: new Date('2024-12-05')
                }
            ],
            messages: [
                {
                    senderId: employee3._id,
                    content: 'I feel excluded from decision-making processes in my team.',
                    timestamp: new Date('2024-12-22')
                }
            ]
        });
        await project3.save();
        console.log('✅ Created Project 3:', project3.uniqueId);

        console.log('\n🎉 Sample data seeded successfully!');
        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('HR Manager:');
        console.log(`  Email: ${hrManager.email}`);
        console.log(`  UniqueID: ${hrManager.uniqueId}`);
        console.log(`  Password: password123`);
        console.log('\nService Manager:');
        console.log(`  Email: ${serviceManager.email}`);
        console.log(`  UniqueID: ${serviceManager.uniqueId}`);
        console.log(`  Password: password123`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📊 Data Summary:');
        console.log(`  - 3 Projects created`);
        console.log(`  - Total Escalated to HR: 4 reports`);
        console.log(`  - Total Resolved: 3 reports`);
        console.log(`  - Total Pending: 2 reports`);
        console.log(`  - Total Reviewed: 1 report`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

seedData();
