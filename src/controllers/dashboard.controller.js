const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const { sendResponse } = require('../utils/apiResponse');

/**
 * @desc    Get key CRM dashboard metrics & statistics
 * @route   GET /api/v1/dashboard/stats
 * @access  Protected
 */
const getDashboardStats = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Build filter base based on user role
  const leadFilter = user.role === 'Sales Executive' ? { assignedTo: user._id } : {};
  const customerFilter = user.role === 'Sales Executive' ? { assignedTo: user._id } : {};
  const dealFilter = user.role === 'Sales Executive' ? { assignedTo: user._id } : {};
  const activityFilter = user.role === 'Sales Executive' ? { assignedTo: user._id } : {};

  // Auto-sync overdue activities before stats
  await Activity.updateMany(
    { ...activityFilter, status: 'Pending', dueDate: { $lt: new Date() } },
    { $set: { status: 'Overdue' } }
  );

  const [
    totalLeads,
    newLeads,
    qualifiedLeads,
    convertedLeads,
    totalCustomers,
    totalDeals,
    openDeals,
    wonDeals,
    lostDeals,
    revenueStats,
    pendingActivities,
    overdueActivities,
  ] = await Promise.all([
    Lead.countDocuments(leadFilter),
    Lead.countDocuments({ ...leadFilter, status: 'New' }),
    Lead.countDocuments({ ...leadFilter, status: 'Qualified' }),
    Lead.countDocuments({ ...leadFilter, status: 'Converted' }),
    Customer.countDocuments(customerFilter),
    Deal.countDocuments(dealFilter),
    Deal.countDocuments({ ...dealFilter, stage: { $nin: ['Won', 'Lost'] } }),
    Deal.countDocuments({ ...dealFilter, stage: 'Won' }),
    Deal.countDocuments({ ...dealFilter, stage: 'Lost' }),
    Deal.aggregate([
      { $match: Object.keys(dealFilter).length > 0 ? dealFilter : { _id: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalWonRevenue: {
            $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, '$value', 0] },
          },
          totalExpectedRevenue: {
            $sum: {
              $cond: [
                { $in: ['$stage', ['Won', 'Lost']] },
                0,
                '$expectedRevenue',
              ],
            },
          },
        },
      },
    ]),
    Activity.countDocuments({ ...activityFilter, status: 'Pending' }),
    Activity.countDocuments({ ...activityFilter, status: 'Overdue' }),
  ]);

  const totalWonRevenue = revenueStats[0]?.totalWonRevenue || 0;
  const totalExpectedRevenue = revenueStats[0]?.totalExpectedRevenue || 0;
  const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

  sendResponse(res, 200, 'Dashboard statistics fetched successfully', {
    metrics: {
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        conversionRate: `${conversionRate}%`,
      },
      customers: {
        total: totalCustomers,
      },
      deals: {
        total: totalDeals,
        open: openDeals,
        won: wonDeals,
        lost: lostDeals,
      },
      financials: {
        totalRevenue: totalWonRevenue,
        expectedRevenue: totalExpectedRevenue,
      },
      activities: {
        pending: pendingActivities,
        overdue: overdueActivities,
      },
    },
  });
});

/**
 * @desc    Get Sales Pipeline breakdown (Count and Value per deal stage)
 * @route   GET /api/v1/dashboard/pipeline
 * @access  Protected
 */
const getSalesPipeline = catchAsync(async (req, res, next) => {
  const user = req.user;
  const dealFilter = user.role === 'Sales Executive' ? { assignedTo: user._id } : {};

  const pipelineStages = ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  const aggregation = await Deal.aggregate([
    { $match: Object.keys(dealFilter).length > 0 ? dealFilter : { _id: { $ne: null } } },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        expectedRevenue: { $sum: '$expectedRevenue' },
      },
    },
  ]);

  // Format array with all stages initialized
  const stageMap = {};
  aggregation.forEach((item) => {
    stageMap[item._id] = item;
  });

  const pipeline = pipelineStages.map((stage) => ({
    stage,
    count: stageMap[stage]?.count || 0,
    totalValue: stageMap[stage]?.totalValue || 0,
    expectedRevenue: stageMap[stage]?.expectedRevenue || 0,
  }));

  sendResponse(res, 200, 'Sales pipeline data fetched successfully', { pipeline });
});

/**
 * @desc    Get Team Performance metrics
 * @route   GET /api/v1/dashboard/team-performance
 * @access  Admin, Sales Manager
 */
const getTeamPerformance = catchAsync(async (req, res, next) => {
  const teamUsers = await User.find({ role: 'Sales Executive', isActive: true }).select('name email role');

  const performance = await Promise.all(
    teamUsers.map(async (userObj) => {
      const uId = userObj._id;
      const [assignedLeads, convertedLeads, wonDeals, totalRevenue, pendingActivities, overdueActivities] =
        await Promise.all([
          Lead.countDocuments({ assignedTo: uId }),
          Lead.countDocuments({ assignedTo: uId, status: 'Converted' }),
          Deal.countDocuments({ assignedTo: uId, stage: 'Won' }),
          Deal.aggregate([
            { $match: { assignedTo: uId, stage: 'Won' } },
            { $group: { _id: null, total: { $sum: '$value' } } },
          ]),
          Activity.countDocuments({ assignedTo: uId, status: 'Pending' }),
          Activity.countDocuments({ assignedTo: uId, status: 'Overdue' }),
        ]);

      const revenue = totalRevenue[0]?.total || 0;
      const conversionRate = assignedLeads > 0 ? Number(((convertedLeads / assignedLeads) * 100).toFixed(2)) : 0;

      return {
        user: userObj,
        assignedLeads,
        convertedLeads,
        conversionRate: `${conversionRate}%`,
        wonDeals,
        totalRevenue: revenue,
        pendingActivities,
        overdueActivities,
      };
    })
  );

  sendResponse(res, 200, 'Team performance metrics fetched successfully', { performance });
});

module.exports = {
  getDashboardStats,
  getSalesPipeline,
  getTeamPerformance,
};
