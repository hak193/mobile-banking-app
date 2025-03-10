const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const config = require('../config');
const packageJson = require('../../package.json');

class SwaggerService {
  constructor() {
    this.specs = null;
    this.initializeSpecs();
  }

  /**
   * Initialize Swagger specifications
   */
  initializeSpecs() {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Mobile Banking API Documentation',
          version: packageJson.version,
          description: 'API documentation for the Mobile Banking application',
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          },
          contact: {
            name: 'API Support',
            url: 'https://bankingapp.com/support',
            email: 'support@bankingapp.com'
          }
        },
        servers: [
          {
            url: `http://localhost:${config.port}/api/${config.apiVersion}`,
            description: 'Development server'
          },
          {
            url: `https://api.bankingapp.com/${config.apiVersion}`,
            description: 'Production server'
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          },
          schemas: this.getSchemas(),
          responses: this.getCommonResponses()
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../models/*.js')
      ]
    };

    this.specs = swaggerJsdoc(options);
  }

  /**
   * Get common schema definitions
   */
  getSchemas() {
    return {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error message'
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE'
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Validation Error'
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  example: 'email'
                },
                message: {
                  type: 'string',
                  example: 'Invalid email format'
                }
              }
            }
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 10
          },
          total: {
            type: 'integer',
            example: 100
          },
          totalPages: {
            type: 'integer',
            example: 10
          },
          hasNext: {
            type: 'boolean',
            example: true
          },
          hasPrev: {
            type: 'boolean',
            example: false
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          email: {
            type: 'string',
            example: 'user@example.com'
          },
          fullName: {
            type: 'string',
            example: 'John Doe'
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            example: 'user'
          }
        }
      },
      Account: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          userId: {
            type: 'integer',
            example: 1
          },
          accountNumber: {
            type: 'string',
            example: '1234567890'
          },
          type: {
            type: 'string',
            enum: ['savings', 'checking'],
            example: 'savings'
          },
          balance: {
            type: 'number',
            example: 1000.50
          },
          currency: {
            type: 'string',
            example: 'USD'
          }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1
          },
          userId: {
            type: 'integer',
            example: 1
          },
          type: {
            type: 'string',
            enum: ['deposit', 'withdrawal', 'transfer'],
            example: 'transfer'
          },
          amount: {
            type: 'number',
            example: 100.50
          },
          currency: {
            type: 'string',
            example: 'USD'
          },
          status: {
            type: 'string',
            enum: ['pending', 'completed', 'failed'],
            example: 'completed'
          }
        }
      }
    };
  }

  /**
   * Get common response definitions
   */
  getCommonResponses() {
    return {
      UnauthorizedError: {
        description: 'Authentication failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    };
  }

  /**
   * Get Swagger UI setup
   */
  getSwaggerUI() {
    return swaggerUi.setup(this.specs, {
      customSiteTitle: 'Mobile Banking API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        deepLinking: true
      }
    });
  }

  /**
   * Get Swagger UI middleware
   */
  getSwaggerMiddleware() {
    return swaggerUi.serve;
  }

  /**
   * Get OpenAPI specifications
   */
  getSpecs() {
    return this.specs;
  }

  /**
   * Create documentation route handler
   */
  createDocumentationHandler(app) {
    if (config.docs.enabled) {
      // Serve Swagger documentation
      app.use(
        config.docs.path,
        this.getSwaggerMiddleware(),
        this.getSwaggerUI()
      );

      // Serve OpenAPI specifications
      app.get('/api-specs.json', (req, res) => {
        res.json(this.specs);
      });
    }
  }
}

module.exports = new SwaggerService();
