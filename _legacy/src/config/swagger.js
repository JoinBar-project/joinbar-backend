const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JoinBar API 文件手冊',
      version: '1.0.0',
      description: `   
      🔗 其他連結：
      [GitHub Repo](https://github.com/JoinBar-project)
      `
    },
    servers: [{ url: 'https://joinbar-backend.zeabur.app' }],
    // servers: [{ url: 'http://localhost:3000' }],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ 
      bearerAuth: [] 
    }], 
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;