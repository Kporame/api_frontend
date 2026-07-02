const parsedData = {
  "openapi": "3.0.0",
  "info": {
    "title": "Sample API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "responses": {
          "200": {
            "description": "A list of users"
          }
        }
      }
    }
  }
};

if (parsedData.paths) {
  const endpointsData = [];
  for (const [path, methods] of Object.entries(parsedData.paths)) {
    for (const [method, details] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        console.log("Found method:", method);
        // Extract responses
        const responses = details.responses || {};
        let responseStatus = null;
        let responseBody = null;
        
        const successCode = Object.keys(responses).find(code => code.startsWith('2'));
        if (successCode) {
          responseStatus = successCode;
          const content = responses[successCode].content;
          if (content && content['application/json'] && content['application/json'].example) {
            responseBody = JSON.stringify(content['application/json'].example, null, 2);
          } else if (responses[successCode].description) {
            responseBody = responses[successCode].description;
          }
        }
        
        endpointsData.push({
          method: method.toUpperCase(),
          path: path,
          title: details.summary || `${method.toUpperCase()} ${path}`,
          description: details.description || '',
          responseStatus: responseStatus,
          responseBody: responseBody,
          isPublic: false
        });
      }
    }
  }
  console.log("Endpoints data:", endpointsData);
}
