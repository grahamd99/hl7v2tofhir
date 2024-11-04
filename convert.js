// convert.js
const fs = require('fs');

// Load the mapping configuration
const loadMapping = () => {
  const data = fs.readFileSync('mapping.json');
  return JSON.parse(data);
};

// Convert FHIR ServiceRequest to HL7 v2 ORM message
const convertToHL7v2 = (fhirServiceRequest, mapping) => {
  const hl7Segments = {
    PID: new Array(20).fill(''), // PID segment with placeholder fields
    ORC: new Array(12).fill(''), // ORC segment with placeholder fields
    OBR: new Array(20).fill('')  // OBR segment with placeholder fields
  };

  // Populate HL7 segments based on mapping
  for (const fhirPath in mapping.ServiceRequest) {
    const hl7Field = mapping.ServiceRequest[fhirPath];
    const [segment, fieldIndex] = hl7Field.split('|');
    const fhirValue = getValueFromFHIR(fhirServiceRequest, fhirPath);

    // Log for debugging
    console.log(`Mapping FHIR path "${fhirPath}" with value "${fhirValue}" to HL7 segment "${segment}" at field index ${fieldIndex}`);

    // Only proceed if value exists in FHIR and segment is defined in hl7Segments
    if (fhirValue && hl7Segments[segment]) {
      hl7Segments[segment][parseInt(fieldIndex, 10) - 1] = fhirValue;
    }
  }

  // Assemble HL7 message string
  const hl7Message = buildHL7Message(hl7Segments);
  return hl7Message;
};

// Helper function to retrieve value from nested FHIR object using dot notation path
const getValueFromFHIR = (obj, path) => {
  try {
    return path.split('.').reduce((acc, part) => {
      const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        return acc && acc[arrayMatch[1]] ? acc[arrayMatch[1]][parseInt(arrayMatch[2], 10)] : undefined;
      }
      return acc ? acc[part] : undefined;
    }, obj);
  } catch (error) {
    console.error(`Error accessing path "${path}" in FHIR object:`, error);
    return undefined;
  }
};

// Assemble HL7 segments into a message string
const buildHL7Message = (segments) => {
  // Ensure all segments are included, joined by the HL7 segment delimiter
  const pidSegment = `PID|${segments.PID.map(field => field || '').join('|')}`;
  const orcSegment = `ORC|${segments.ORC.map(field => field || '').join('|')}`;
  const obrSegment = `OBR|${segments.OBR.map(field => field || '').join('|')}`;

  const final = pidSegment + '\n' +  orcSegment + '\n' + obrSegment;

  // Join segments with carriage return separators
  //return [pidSegment, orcSegment, obrSegment].join('\r');
  return [final].join('\r');
};

module.exports = { loadMapping, convertToHL7v2 };
