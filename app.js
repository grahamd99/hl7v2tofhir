// app.js
const { loadMapping, convertToHL7v2 } = require('./convert');

// Sample FHIR ServiceRequest JSON
const serviceRequest = {
  "resourceType": "ServiceRequest",
  "id": "mammography-request-123",
  "status": "active",
  "intent": "order",
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "24623002",
        "display": "Screening mammography"
      }
    ],
    "text": "Screening mammography"
  },
  "subject": {
    "reference": "Patient/123"
  }
};

// Main function to perform conversion
const main = () => {
  const mapping = loadMapping();
  const hl7Message = convertToHL7v2(serviceRequest, mapping);
  
  console.log("Generated HL7 ORM Message:");
  console.log(hl7Message);
};

main();
