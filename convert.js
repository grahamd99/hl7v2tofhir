const fs = require('fs');

// Load the mapping configuration
const loadMapping = () => {
  const data = fs.readFileSync('mapping.json');
  return JSON.parse(data);
};


// Convert FHIR Bundle to HL7 v2 ORM message
const convertToHL7v2 = (fhirBundle, mapping) => {
  const hl7Segments = {
    MSH: new Array(12).fill(''),
    PID: new Array(20).fill(''),
    ORC: new Array(12).fill(''),
    OBR: new Array(20).fill('')
  };

  // Extract resources from the Bundle
  const patientResource = fhirBundle.entry.find(e => e.resource.resourceType === 'Patient').resource;
  const serviceRequestResource = fhirBundle.entry.find(e => e.resource.resourceType === 'ServiceRequest').resource;

  // Hardcode MSH segment values, including "ORM^O01" in field 8
  hl7Segments.MSH[1] = "^~&";
  hl7Segments.MSH[2] = "HIS";
  hl7Segments.MSH[3] = "HOSPITAL";
  hl7Segments.MSH[5] = "RAD";
  hl7Segments.MSH[5] = "DEPT";
  hl7Segments.MSH[7] = "ORM^O01"; // HL7 field indices are zero-based here

  // Populate other HL7 segments based on mapping, adjusting paths for Bundle
  for (const fhirPath in mapping.Bundle) {
    const hl7Field = mapping.Bundle[fhirPath];
    const [segment, fieldIndex] = hl7Field.split('|');
    let fhirValue = getValueFromBundle(fhirBundle, fhirPath);

    // Convert datetime if path is "authoredOn"
    if (fhirPath === 'ServiceRequest.authoredOn' && fhirValue) {
      fhirValue = formatDateToHL7(fhirValue);
    }

    console.log(`Mapping FHIR path "${fhirPath}" with value "${fhirValue}" to HL7 segment "${segment}" at field index ${fieldIndex}`);

    if (fhirValue && hl7Segments[segment]) {
      hl7Segments[segment][parseInt(fieldIndex, 10) - 1] = fhirValue;
    }
  }

  return buildHL7Message(hl7Segments);
};

// Helper function to retrieve value from nested FHIR Bundle using dot notation path
const getValueFromBundle = (bundle, path) => {
  const [resourceType, ...restOfPath] = path.split('.');
  const resource = bundle.entry.find(e => e.resource.resourceType === resourceType);
  return getValueFromFHIR(resource ? resource.resource : {}, restOfPath.join('.'));
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

// Helper function to convert ISO 8601 date-time to HL7 format (YYYYMMDDhhmm)
const formatDateToHL7 = (isoDateTime) => {
  const date = new Date(isoDateTime);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}`;
};


// Assemble HL7 segments into a message string
const buildHL7Message = (segments) => {
  // Ensure all segments are included, joined by the HL7 segment delimiter
  const mshSegment = `MSH|${segments.MSH.map((field) => field || "").join("|")}`;
  const pidSegment = `PID|${segments.PID.map((field) => field || "").join("|")}`;
  const orcSegment = `ORC|${segments.ORC.map((field) => field || "").join("|")}`;
  const obrSegment = `OBR|${segments.OBR.map((field) => field || "").join("|")}`;

  const final =
    mshSegment + "\n" + pidSegment + "\n" + orcSegment + "\n" + obrSegment;

  // Join segments with carriage return separators
  //return [pidSegment, orcSegment, obrSegment].join('\r');
  //return [mshSegment, pidSegment, orcSegment, obrSegment].join('\r');
  return [final].join("\r");

};

module.exports = { loadMapping, convertToHL7v2 };
