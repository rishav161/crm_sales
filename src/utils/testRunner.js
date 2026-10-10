const http = require('http');

const BASE_URL = 'http://localhost:5000/api/v1';

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const results = [];

const logResult = (id, name, pass, detail) => {
  const symbol = pass ? '✅ PASS' : '❌ FAIL';
  results.push({ id, name, pass, detail });
  console.log(`[${symbol}] ${id}: ${name} - ${detail}`);
};

const runTests = async () => {
  console.log('\n======================================================');
  console.log('🚀 STARTING COMPREHENSIVE CRM API TEST SUITE EXECUTION');
  console.log('======================================================\n');

  let adminToken = '';
  let execToken = '';
  let managerToken = '';

  let createdUserId = '';
  let createdLeadId = '';
  let createdCustomerId = '';
  let createdDealId = '';
  let createdActivityId = '';

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION & AUTHORIZATION SUITE
    // ----------------------------------------------------
    // TC-AUTH-02: Login as Admin
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@crm.com',
      password: 'Password123!',
    });
    if (adminLogin.status === 200 && adminLogin.body.data.token) {
      adminToken = adminLogin.body.data.token;
      logResult('TC-AUTH-02', 'Admin Login', true, 'Admin logged in successfully, token received');
    } else {
      logResult('TC-AUTH-02', 'Admin Login', false, `Status ${adminLogin.status}`);
    }

    // Login as Executive
    const execLogin = await request('POST', '/auth/login', {
      email: 'alex@crm.com',
      password: 'Password123!',
    });
    if (execLogin.status === 200) execToken = execLogin.body.data.token;

    // Login as Manager
    const managerLogin = await request('POST', '/auth/login', {
      email: 'manager@crm.com',
      password: 'Password123!',
    });
    if (managerLogin.status === 200) managerToken = managerLogin.body.data.token;

    // TC-AUTH-01: Register New Sales Executive
    const regEmail = `testexec_${Date.now()}@crm.com`;
    const regRes = await request('POST', '/auth/register', {
      name: 'Test Exec',
      email: regEmail,
      password: 'Password123!',
      role: 'Sales Executive',
    });
    logResult('TC-AUTH-01', 'Register User', regRes.status === 201, `Status ${regRes.status}, User ID: ${regRes.body.data?.user?._id}`);

    // TC-AUTH-03: Login with Invalid Password
    const badLogin = await request('POST', '/auth/login', {
      email: 'admin@crm.com',
      password: 'WrongPassword!',
    });
    logResult('TC-AUTH-03', 'Invalid Password Rejection', badLogin.status === 401, `Returned status ${badLogin.status}`);

    // TC-AUTH-04: Fetch Profile /me
    const meRes = await request('GET', '/auth/me', null, adminToken);
    logResult('TC-AUTH-04', 'Get Profile (/me)', meRes.status === 200 && meRes.body.data.user.email === 'admin@crm.com', `Fetched user: ${meRes.body.data?.user?.name}`);

    // TC-AUTH-05: Protected route without token
    const noTokenRes = await request('GET', '/auth/me');
    logResult('TC-AUTH-05', 'Unauthenticated Guard', noTokenRes.status === 401, `Blocked with status ${noTokenRes.status}`);

    // ----------------------------------------------------
    // 2. USER MANAGEMENT SUITE
    // ----------------------------------------------------
    // TC-USER-01: Admin Create User
    const newUserEmail = `newuser_${Date.now()}@crm.com`;
    const createUserRes = await request('POST', '/users', {
      name: 'Temp User',
      email: newUserEmail,
      password: 'Password123!',
      role: 'Sales Executive',
    }, adminToken);
    if (createUserRes.status === 201) createdUserId = createUserRes.body.data.user._id;
    logResult('TC-USER-01', 'Admin Create User', createUserRes.status === 201, `User created: ${createdUserId}`);

    // TC-USER-02: Get Users List
    const getUsersRes = await request('GET', '/users?role=Sales Executive&page=1&limit=5', null, adminToken);
    logResult('TC-USER-02', 'List Users with Filter', getUsersRes.status === 200 && Array.isArray(getUsersRes.body.data.users), `Fetched ${getUsersRes.body.data?.users?.length} users, Total: ${getUsersRes.body.meta?.totalRecords}`);

    // TC-USER-03: Deactivate User & TC-AUTH-06 Deactivated Login Block
    if (createdUserId) {
      const deactRes = await request('PATCH', `/users/${createdUserId}/status`, { isActive: false }, adminToken);
      logResult('TC-USER-03', 'Deactivate User Account', deactRes.status === 200 && deactRes.body.data.user.isActive === false, 'User status set to false');

      const deactLogin = await request('POST', '/auth/login', {
        email: newUserEmail,
        password: 'Password123!',
      });
      logResult('TC-AUTH-06', 'Deactivated Account Login Block', deactLogin.status === 403, `Blocked login with status ${deactLogin.status}`);
    }

    // TC-USER-04: Non-Admin Create User (Forbidden check)
    const execCreateUser = await request('POST', '/users', {
      name: 'Unauthorized',
      email: 'unauth@crm.com',
      password: 'Password123!',
      role: 'Sales Executive',
    }, execToken);
    logResult('TC-USER-04', 'Non-Admin User Creation Block', execCreateUser.status === 403, `Blocked by RBAC with status ${execCreateUser.status}`);

    // ----------------------------------------------------
    // 3. LEAD MANAGEMENT & CONVERSION SUITE
    // ----------------------------------------------------
    // TC-LEAD-01: Create Lead
    const createLeadRes = await request('POST', '/leads', {
      name: 'Testing Lead',
      email: `lead_${Date.now()}@company.com`,
      company: 'Global Enterprises',
      source: 'Website',
      status: 'New',
      priority: 'High',
      description: 'Prospect interested in cloud solution.',
    }, adminToken);
    if (createLeadRes.status === 201) createdLeadId = createLeadRes.body.data.lead._id;
    logResult('TC-LEAD-01', 'Create Lead', createLeadRes.status === 201, `Lead ID: ${createdLeadId}`);

    // TC-LEAD-02: Multi-filter Lead List
    const filterLeadsRes = await request('GET', '/leads?status=New&priority=High&source=Website', null, adminToken);
    logResult('TC-LEAD-02', 'Multi-filter Lead Search', filterLeadsRes.status === 200, `Found ${filterLeadsRes.body.data?.leads?.length} matching leads`);

    // TC-LEAD-03: Executive Data Scoping
    const execLeadsRes = await request('GET', '/leads', null, execToken);
    logResult('TC-LEAD-03', 'Executive RBAC Data Scoping', execLeadsRes.status === 200, `Executive sees ${execLeadsRes.body.data?.leads?.length} assigned leads`);

    // TC-LEAD-04: Update Lead Status to Qualified
    if (createdLeadId) {
      const statusRes = await request('PATCH', `/leads/${createdLeadId}/status`, { status: 'Qualified' }, adminToken);
      logResult('TC-LEAD-04', 'Update Lead Status to Qualified', statusRes.status === 200 && statusRes.body.data.lead.status === 'Qualified', 'Status updated to Qualified');

      // TC-LEAD-05: Assign Lead to Manager/Executive
      const meUserRes = await request('GET', '/auth/me', null, execToken);
      const execUserId = meUserRes.body.data.user._id;

      const assignRes = await request('PATCH', `/leads/${createdLeadId}/assign`, { assignedTo: execUserId }, adminToken);
      logResult('TC-LEAD-05', 'Reassign Lead', assignRes.status === 200 && assignRes.body.data.lead.assignedTo === execUserId, `Reassigned to executive ID ${execUserId}`);

      // TC-LEAD-06: Atomic Lead Conversion
      const convertRes = await request('POST', `/leads/${createdLeadId}/convert`, {
        dealTitle: 'Global Enterprises - Cloud Enterprise Deal',
        dealValue: 75000,
        probability: 60,
        dealDescription: 'Converted from qualified lead.',
      }, adminToken);
      if (convertRes.status === 200) {
        createdCustomerId = convertRes.body.data.customer._id;
        createdDealId = convertRes.body.data.deal._id;
      }
      logResult('TC-LEAD-06', 'Atomic Lead Conversion', convertRes.status === 200, `Created Customer ID: ${createdCustomerId}, Deal ID: ${createdDealId}`);

      // TC-LEAD-07: Prevent Double Conversion
      const reconvertRes = await request('POST', `/leads/${createdLeadId}/convert`, {
        dealTitle: 'Double Convert',
      }, adminToken);
      logResult('TC-LEAD-07', 'Prevent Double Conversion', reconvertRes.status === 400, `Blocked double conversion with status ${reconvertRes.status}`);
    }

    // ----------------------------------------------------
    // 4. CUSTOMER MANAGEMENT SUITE
    // ----------------------------------------------------
    // TC-CUST-01: List Customers
    const getCustRes = await request('GET', '/customers', null, adminToken);
    logResult('TC-CUST-01', 'List Customers', getCustRes.status === 200, `Fetched ${getCustRes.body.data?.customers?.length} customers`);

    // TC-CUST-02: Get Customer by ID
    if (createdCustomerId) {
      const getCustIdRes = await request('GET', `/customers/${createdCustomerId}`, null, adminToken);
      logResult('TC-CUST-02', 'Get Customer by ID', getCustIdRes.status === 200 && getCustIdRes.body.data.customer.name === 'Testing Lead', `Fetched customer ${getCustIdRes.body.data?.customer?.company}`);
    }

    // ----------------------------------------------------
    // 5. DEAL MANAGEMENT & BUSINESS RULES SUITE
    // ----------------------------------------------------
    if (createdDealId) {
      // TC-DEAL-01: Fetch Deal & Check Calculated Revenue
      const getDealRes = await request('GET', `/deals/${createdDealId}`, null, adminToken);
      const dealObj = getDealRes.body.data?.deal;
      const expectedRev = (75000 * 60) / 100; // 45000
      logResult('TC-DEAL-01', 'Expected Revenue Auto-calculation', getDealRes.status === 200 && dealObj?.expectedRevenue === expectedRev, `Expected Revenue calculated as $${dealObj?.expectedRevenue}`);

      // TC-DEAL-02: Validate negative deal value rejected by Zod
      const badDeal = await request('POST', '/deals', {
        title: 'Bad Value Deal',
        customerId: createdCustomerId,
        value: -500,
        expectedClosingDate: '2026-12-31',
      }, adminToken);
      logResult('TC-DEAL-02', 'Reject Negative Deal Value (Zod)', badDeal.status === 400, `Rejected with status ${badDeal.status}`);

      // TC-DEAL-03: Stage Transition to Proposal
      const stageRes = await request('PATCH', `/deals/${createdDealId}/stage`, { stage: 'Proposal' }, adminToken);
      logResult('TC-DEAL-03', 'Stage Transition to Proposal', stageRes.status === 200 && stageRes.body.data.deal.stage === 'Proposal', 'Deal stage updated to Proposal');

      // TC-DEAL-05: Reject Lost stage without lostReason
      const noReasonRes = await request('PATCH', `/deals/${createdDealId}/stage`, { stage: 'Lost' }, adminToken);
      logResult('TC-DEAL-05', 'Reject Lost Stage without Reason', noReasonRes.status === 400, `Blocked missing lost reason with status ${noReasonRes.status}`);

      // TC-DEAL-04: Mark Deal as Won (probability auto-sets to 100%)
      const wonRes = await request('PATCH', `/deals/${createdDealId}/stage`, { stage: 'Won' }, adminToken);
      logResult('TC-DEAL-04', 'Mark Deal as Won (Prob=100%)', wonRes.status === 200 && wonRes.body.data.deal.stage === 'Won' && wonRes.body.data.deal.probability === 100, 'Deal marked as Won with 100% probability');

      // TC-DEAL-07: Non-admin attempt to reopen closed deal
      const execReopen = await request('PATCH', `/deals/${createdDealId}/stage`, { stage: 'Proposal' }, execToken);
      logResult('TC-DEAL-07', 'Non-Admin Reopen Closed Deal Block', execReopen.status === 403, `Blocked non-admin reopen with status ${execReopen.status}`);
    }

    // ----------------------------------------------------
    // 6. SALES ACTIVITIES & OVERDUE SUITE
    // ----------------------------------------------------
    if (createdLeadId) {
      // TC-ACT-01: Create Activity linked to Lead
      const actRes = await request('POST', '/activities', {
        type: 'Call',
        title: 'Sales Qualification Call',
        description: 'Call prospect to confirm budget.',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday (Overdue)
        relatedEntity: {
          entityType: 'Lead',
          entityId: createdLeadId,
        },
      }, adminToken);
      if (actRes.status === 201) createdActivityId = actRes.body.data.activity._id;
      logResult('TC-ACT-01', 'Create Activity Linked to Lead', actRes.status === 201, `Activity ID: ${createdActivityId}`);

      // TC-ACT-02: Auto-detect Overdue Status
      const listAct = await request('GET', '/activities', null, adminToken);
      const overdueAct = listAct.body.data?.activities?.find((a) => a._id === createdActivityId);
      logResult('TC-ACT-02', 'Auto-detect Overdue Status', listAct.status === 200 && overdueAct?.status === 'Overdue', `Status dynamically set to '${overdueAct?.status}'`);

      // TC-ACT-03: Mark Activity as Completed
      if (createdActivityId) {
        const compRes = await request('PATCH', `/activities/${createdActivityId}/complete`, null, adminToken);
        logResult('TC-ACT-03', 'Mark Activity as Completed', compRes.status === 200 && compRes.body.data.activity.status === 'Completed', 'Activity status marked Completed');
      }
    }

    // ----------------------------------------------------
    // 7. TIMELINE AUDIT HISTORY SUITE
    // ----------------------------------------------------
    if (createdLeadId) {
      const timeRes = await request('GET', `/timeline/Lead/${createdLeadId}`, null, adminToken);
      logResult('TC-TIME-01', 'Fetch Lead Timeline Audit History', timeRes.status === 200 && Array.isArray(timeRes.body.data.timeline), `Retrieved ${timeRes.body.data?.timeline?.length} audit events`);
    }

    if (createdDealId) {
      const timeDealRes = await request('GET', `/timeline/Deal/${createdDealId}`, null, adminToken);
      logResult('TC-TIME-02', 'Fetch Deal Timeline Audit History', timeDealRes.status === 200 && Array.isArray(timeDealRes.body.data.timeline), `Retrieved ${timeDealRes.body.data?.timeline?.length} audit events`);
    }

    // ----------------------------------------------------
    // 8. DASHBOARD & ANALYTICS SUITE
    // ----------------------------------------------------
    // TC-DASH-01: Get Dashboard Stats
    const statsRes = await request('GET', '/dashboard/stats', null, adminToken);
    const m = statsRes.body?.data?.metrics;
    logResult('TC-DASH-01', 'Fetch Dashboard Statistics', statsRes.status === 200 && Boolean(m), `Status: ${statsRes.status}, Total Revenue: $${m?.financials?.totalRevenue}, Conversion Rate: ${m?.leads?.conversionRate}`);

    // TC-DASH-02: Sales Pipeline Aggregation
    const pipeRes = await request('GET', '/dashboard/pipeline', null, adminToken);
    logResult('TC-DASH-02', 'Fetch Sales Pipeline Breakdown', pipeRes.status === 200 && Array.isArray(pipeRes.body.data.pipeline), `Retrieved breakdown across ${pipeRes.body.data?.pipeline?.length} pipeline stages`);

    // TC-DASH-03: Team Performance Metrics
    const teamRes = await request('GET', '/dashboard/team-performance', null, adminToken);
    logResult('TC-DASH-03', 'Fetch Team Performance Metrics', teamRes.status === 200 && Array.isArray(teamRes.body.data.performance), `Retrieved stats for ${teamRes.body.data?.performance?.length} reps`);

    // ----------------------------------------------------
    // 9. VALIDATION & ERROR HANDLING SUITE
    // ----------------------------------------------------
    // TC-ERR-01: Zod Email Validation Error
    const badEmailRes = await request('POST', '/auth/register', {
      name: 'Bad Email',
      email: 'not-a-valid-email',
      password: '123',
    });
    logResult('TC-ERR-01', 'Zod Input Validation Format (400)', badEmailRes.status === 400 && Array.isArray(badEmailRes.body.errors), `Returned 400 validation error list with ${badEmailRes.body.errors?.length} issue(s)`);

    // TC-ERR-02: Invalid MongoDB ObjectId Parameter
    const badIdRes = await request('GET', '/leads/invalidObjectId123', null, adminToken);
    logResult('TC-ERR-02', 'Invalid ObjectId CastError (400)', badIdRes.status === 400, `Returned status ${badIdRes.status} with message: '${badIdRes.body.message}'`);

    // TC-ERR-03: Resource Not Found
    const notFoundId = '507f1f77bcf86cd799439011';
    const notFoundRes = await request('GET', `/leads/${notFoundId}`, null, adminToken);
    logResult('TC-ERR-03', 'Resource Not Found (404)', notFoundRes.status === 404, `Returned status ${notFoundRes.status}`);

    // TC-ERR-04: Non-existent Route
    const badRouteRes = await request('GET', '/non-existent-route-xyz');
    logResult('TC-ERR-04', 'Non-existent Route (404)', badRouteRes.status === 404, `Returned status ${badRouteRes.status}`);

  } catch (error) {
    console.error('[Test Execution Error]:', error.message);
  }

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log('\n======================================================');
  console.log(`📋 TEST SUITE SUMMARY: TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
  console.log('======================================================\n');
};

runTests();
