const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Sales Management System API',
      version: '1.0.0',
      description:
        'Comprehensive RESTful API for managing end-to-end CRM sales pipeline: Leads -> Customers -> Deals -> Activities & Audit Timelines.',
      contact: {
        name: 'Backend Developer Assignment',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'User registration, authentication, & token management' },
      { name: 'Users', description: 'Admin user CRUD and account activation/deactivation' },
      { name: 'Leads', description: 'Lead CRUD, multi-filtering, assignment, & atomic conversion' },
      { name: 'Customers', description: 'Customer lifecycle management' },
      { name: 'Deals', description: 'Sales deal pipeline, stages, & probability rules' },
      { name: 'Activities', description: 'Calls, emails, meetings, follow-ups, & overdue automation' },
      { name: 'Timeline', description: 'Centralized audit log history tracking' },
      { name: 'Dashboard', description: 'Sales statistics, pipeline aggregations, & team metrics' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT access token in format: Bearer <token>',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message description' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ---------------- AUTH ----------------
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user account',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password'],
                  properties: {
                    name: { type: 'string', example: 'Alex Executive' },
                    email: { type: 'string', example: 'alex@crm.com' },
                    password: { type: 'string', example: 'Password123!' },
                    phone: { type: 'string', example: '+1-555-0300' },
                    role: { type: 'string', enum: ['Admin', 'Sales Manager', 'Sales Executive'], example: 'Sales Executive' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User registered successfully' }, 400: { description: 'Validation or duplicate email error' } },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'User login to receive JWT tokens',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', example: 'admin@crm.com' },
                    password: { type: 'string', example: 'Password123!' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Login successful' }, 401: { description: 'Invalid email or password' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current logged-in user profile',
          responses: { 200: { description: 'Profile details fetched' }, 401: { description: 'Unauthenticated' } },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout current user',
          responses: { 200: { description: 'Logged out successfully' } },
        },
      },

      // ---------------- USERS ----------------
      '/users': {
        post: {
          tags: ['Users'],
          summary: 'Admin: Create a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'role'],
                  properties: {
                    name: { type: 'string', example: 'Sarah Manager' },
                    email: { type: 'string', example: 'sarah@crm.com' },
                    password: { type: 'string', example: 'Password123!' },
                    role: { type: 'string', enum: ['Admin', 'Sales Manager', 'Sales Executive'], example: 'Sales Manager' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'User created' }, 403: { description: 'Forbidden for non-admins' } },
        },
        get: {
          tags: ['Users'],
          summary: 'List users with search, filtering, & pagination',
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search name or email' },
            { in: 'query', name: 'role', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string' }, description: 'true or false' },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'Users list retrieved' } },
        },
      },
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user details by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User details' }, 404: { description: 'User not found' } },
        },
        put: {
          tags: ['Users'],
          summary: 'Admin: Update user details',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'User updated' } },
        },
        delete: {
          tags: ['Users'],
          summary: 'Admin: Delete user',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'User deleted' } },
        },
      },
      '/users/{id}/status': {
        patch: {
          tags: ['Users'],
          summary: 'Admin: Activate or deactivate user account',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { isActive: { type: 'boolean', example: false } } } } },
          },
          responses: { 200: { description: 'Status updated' } },
        },
      },

      // ---------------- LEADS ----------------
      '/leads': {
        post: {
          tags: ['Leads'],
          summary: 'Create a new lead',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email'],
                  properties: {
                    name: { type: 'string', example: 'John Doe' },
                    email: { type: 'string', example: 'johndoe@acme.corp' },
                    company: { type: 'string', example: 'Acme Corp' },
                    source: { type: 'string', enum: ['Website', 'Referral', 'Social Media', 'Email', 'Phone', 'Other'], example: 'Website' },
                    status: { type: 'string', enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'], example: 'New' },
                    priority: { type: 'string', enum: ['Low', 'Medium', 'High'], example: 'High' },
                    description: { type: 'string', example: 'Interested in software package' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Lead created' } },
        },
        get: {
          tags: ['Leads'],
          summary: 'List leads with multi-filtering, search, & pagination',
          parameters: [
            { in: 'query', name: 'search', schema: { type: 'string' } },
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'priority', schema: { type: 'string' } },
            { in: 'query', name: 'source', schema: { type: 'string' } },
            { in: 'query', name: 'assignedTo', schema: { type: 'string' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'Leads list retrieved' } },
        },
      },
      '/leads/{id}': {
        get: {
          tags: ['Leads'],
          summary: 'Get single lead by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Lead details' } },
        },
        put: {
          tags: ['Leads'],
          summary: 'Update lead details',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 200: { description: 'Lead updated' } },
        },
        delete: {
          tags: ['Leads'],
          summary: 'Delete lead',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Lead deleted' } },
        },
      },
      '/leads/{id}/status': {
        patch: {
          tags: ['Leads'],
          summary: 'Update lead status',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'Qualified' } } } } } },
          responses: { 200: { description: 'Lead status updated' } },
        },
      },
      '/leads/{id}/assign': {
        patch: {
          tags: ['Leads'],
          summary: 'Assign/Reassign lead to active sales rep',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { assignedTo: { type: 'string' } } } } } },
          responses: { 200: { description: 'Lead assigned successfully' } },
        },
      },
      '/leads/{id}/convert': {
        post: {
          tags: ['Leads'],
          summary: 'Atomic Lead Conversion to Customer & Deal',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dealTitle: { type: 'string', example: 'Acme Enterprise Deal' },
                    dealValue: { type: 'number', example: 50000 },
                    probability: { type: 'number', example: 60 },
                    expectedClosingDate: { type: 'string', example: '2026-12-31' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Lead converted to Customer & Deal' }, 400: { description: 'Lead already converted' } },
        },
      },

      // ---------------- CUSTOMERS ----------------
      '/customers': {
        post: {
          tags: ['Customers'],
          summary: 'Create customer',
          requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
          responses: { 201: { description: 'Customer created' } },
        },
        get: {
          tags: ['Customers'],
          summary: 'List customers with search & pagination',
          parameters: [{ in: 'query', name: 'search', schema: { type: 'string' } }],
          responses: { 200: { description: 'Customers list' } },
        },
      },
      '/customers/{id}': {
        get: {
          tags: ['Customers'],
          summary: 'Get customer by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Customer details' } },
        },
        put: {
          tags: ['Customers'],
          summary: 'Update customer',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Customer updated' } },
        },
        delete: {
          tags: ['Customers'],
          summary: 'Delete customer',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Customer deleted' } },
        },
      },

      // ---------------- DEALS ----------------
      '/deals': {
        post: {
          tags: ['Deals'],
          summary: 'Create deal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'customerId', 'value', 'expectedClosingDate'],
                  properties: {
                    title: { type: 'string', example: 'Enterprise Cloud Deal' },
                    customerId: { type: 'string' },
                    value: { type: 'number', example: 75000 },
                    probability: { type: 'number', example: 70 },
                    expectedClosingDate: { type: 'string', example: '2026-12-31' },
                    stage: { type: 'string', enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], example: 'Qualification' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Deal created' } },
        },
        get: {
          tags: ['Deals'],
          summary: 'List deals with stage, amount range, & date filters',
          parameters: [
            { in: 'query', name: 'stage', schema: { type: 'string' } },
            { in: 'query', name: 'minAmount', schema: { type: 'number' } },
            { in: 'query', name: 'maxAmount', schema: { type: 'number' } },
          ],
          responses: { 200: { description: 'Deals list' } },
        },
      },
      '/deals/{id}': {
        get: {
          tags: ['Deals'],
          summary: 'Get deal by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deal details' } },
        },
        put: {
          tags: ['Deals'],
          summary: 'Update deal',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deal updated' } },
        },
        delete: {
          tags: ['Deals'],
          summary: 'Delete deal',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deal deleted' } },
        },
      },
      '/deals/{id}/stage': {
        patch: {
          tags: ['Deals'],
          summary: 'Update deal stage enforcing business rules (Lost reason, Won probability 100%)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['stage'],
                  properties: {
                    stage: { type: 'string', enum: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], example: 'Won' },
                    lostReason: { type: 'string', example: 'Pricing competitor lower' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Stage updated' }, 400: { description: 'Lost reason missing' }, 403: { description: 'Reopening closed deal forbidden for non-admins' } },
        },
      },

      // ---------------- ACTIVITIES ----------------
      '/activities': {
        post: {
          tags: ['Activities'],
          summary: 'Create sales activity/follow-up',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type', 'title', 'dueDate', 'relatedEntity'],
                  properties: {
                    type: { type: 'string', enum: ['Call', 'Email', 'Meeting', 'Demo', 'Follow-up', 'Reminder', 'Note'], example: 'Meeting' },
                    title: { type: 'string', example: 'Discovery Call' },
                    dueDate: { type: 'string', example: '2026-10-15T10:00:00.000Z' },
                    relatedEntity: {
                      type: 'object',
                      properties: {
                        entityType: { type: 'string', enum: ['Lead', 'Customer', 'Deal', 'User'], example: 'Lead' },
                        entityId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Activity created' } },
        },
        get: {
          tags: ['Activities'],
          summary: 'List activities with auto-overdue detection',
          responses: { 200: { description: 'Activities list' } },
        },
      },
      '/activities/{id}': {
        get: {
          tags: ['Activities'],
          summary: 'Get activity by ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Activity details' } },
        },
        put: {
          tags: ['Activities'],
          summary: 'Update activity',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Activity updated' } },
        },
        delete: {
          tags: ['Activities'],
          summary: 'Delete activity',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Activity deleted' } },
        },
      },
      '/activities/{id}/complete': {
        patch: {
          tags: ['Activities'],
          summary: 'Mark activity as completed',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Marked completed' } },
        },
      },

      // ---------------- TIMELINE ----------------
      '/timeline/{entityType}/{entityId}': {
        get: {
          tags: ['Timeline'],
          summary: 'Get chronological audit log history for Lead, Customer, or Deal',
          parameters: [
            { in: 'path', name: 'entityType', required: true, schema: { type: 'string', enum: ['Lead', 'Customer', 'Deal'] } },
            { in: 'path', name: 'entityId', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Timeline audit events list' } },
        },
      },

      // ---------------- DASHBOARD ----------------
      '/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get overall CRM statistics, conversion rates, & revenue metrics',
          responses: { 200: { description: 'CRM statistics retrieved' } },
        },
      },
      '/dashboard/pipeline': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get 6-stage sales pipeline deal count and value breakdown',
          responses: { 200: { description: 'Pipeline stage breakdown' } },
        },
      },
      '/dashboard/team-performance': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get sales team performance breakdown (Admin & Manager)',
          responses: { 200: { description: 'Team performance stats' } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
