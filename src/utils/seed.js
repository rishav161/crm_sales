require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const Timeline = require('../models/Timeline');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_sales_db';

const seedData = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('[Seed]: Connected to MongoDB...');

    // Clear existing collections
    await User.deleteMany({});
    await Lead.deleteMany({});
    await Customer.deleteMany({});
    await Deal.deleteMany({});
    await Activity.deleteMany({});
    await Timeline.deleteMany({});

    console.log('[Seed]: Cleared existing collections.');

    // 1. Create Users
    const admin = await User.create({
      name: 'Rishav Admin',
      email: 'rishavadmin@gmail.com',
      phone: '+1-555-0100',
      password: 'Password@123',
      role: 'Admin',
      isActive: true,
    });

    const manager = await User.create({
      name: 'Rishav Manager',
      email: 'rishavmanager@gmail.com',
      phone: '+1-555-0200',
      password: 'Password@123',
      role: 'Sales Manager',
      isActive: true,
    });

    const executive = await User.create({
      name: 'Rishav Executive',
      email: 'rishavexecutive@gmail.com',
      phone: '+1-555-0300',
      password: 'Password@123',
      role: 'Sales Executive',
      isActive: true,
    });

    console.log('[Seed]: Users created:');
    console.log('   - Admin: rishavadmin@gmail.com (Password@123)');
    console.log('   - Manager: rishavmanager@gmail.com (Password@123)');
    console.log('   - Executive: rishavexecutive@gmail.com (Password@123)');

    // 2. Create Sample Leads
    const lead1 = await Lead.create({
      name: 'John Doe',
      email: 'johndoe@acme.corp',
      phone: '+1-555-9876',
      company: 'Acme Corp',
      source: 'Website',
      status: 'Qualified',
      priority: 'High',
      assignedTo: executive._id,
      description: 'Interested in enterprise license package.',
      createdBy: manager._id,
    });

    const lead2 = await Lead.create({
      name: 'Jane Smith',
      email: 'janesmith@techtech.io',
      phone: '+1-555-5432',
      company: 'TechTech Solutions',
      source: 'Referral',
      status: 'New',
      priority: 'Medium',
      assignedTo: executive._id,
      description: 'Requested product demo and pricing catalog.',
      createdBy: executive._id,
    });

    console.log('[Seed]: Leads created.');

    // 3. Create Sample Customer & Deal
    const customer1 = await Customer.create({
      name: lead1.name,
      email: lead1.email,
      phone: lead1.phone,
      company: lead1.company,
      leadId: lead1._id,
      assignedTo: executive._id,
      status: 'Active',
      createdBy: executive._id,
    });

    const deal1 = await Deal.create({
      title: 'Acme Corp - Enterprise Software Deal',
      leadId: lead1._id,
      customerId: customer1._id,
      assignedTo: executive._id,
      value: 50000,
      probability: 70,
      expectedClosingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      stage: 'Proposal',
      description: 'Submitted initial proposal for 500 seats.',
      createdBy: executive._id,
    });

    console.log('[Seed]: Customer & Deal created.');

    // 4. Create Sample Activities
    await Activity.create({
      type: 'Meeting',
      title: 'Initial Discovery Call with Acme',
      description: 'Discuss technical requirements and roadmap.',
      assignedTo: executive._id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
      status: 'Overdue',
      relatedEntity: {
        entityType: 'Lead',
        entityId: lead1._id,
      },
      createdBy: executive._id,
    });

    await Activity.create({
      type: 'Follow-up',
      title: 'Send Contract Proposal PDF',
      description: 'Follow up on proposal feedback.',
      assignedTo: executive._id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Pending
      status: 'Pending',
      relatedEntity: {
        entityType: 'Deal',
        entityId: deal1._id,
      },
      createdBy: executive._id,
    });

    console.log('[Seed]: Activities created.');

    // 5. Audit Timeline Entries
    await Timeline.create({
      action: 'Lead Created',
      entityType: 'Lead',
      entityId: lead1._id,
      performedBy: manager._id,
      newValue: { name: lead1.name, email: lead1.email },
    });

    await Timeline.create({
      action: 'Lead Assigned',
      entityType: 'Lead',
      entityId: lead1._id,
      performedBy: manager._id,
      newValue: { assignedTo: executive._id },
    });

    console.log('[Seed]: Timeline audit history logged.');
    console.log('[Seed]: Data seeding completed successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
