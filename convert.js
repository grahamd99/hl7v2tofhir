const fs = require('fs');

// Load mapping configuration
const loadMapping = () => JSON.parse(fs.readFileSync('mapping.json'));

// Load value mappings
const loadValueMappings = () => JSON.parse(fs.readFileSync('valueMappings.json'));

// Convert FHIR Bundle to HL7 v2 ORM message
const convertToHL7v2 = (fhirBundle, mapping, valueMappings) => {
  const hl7Segments = {
    MSH: new Array(12).fill(''),
    PID: new Array(20).fill(''),
    ORC: new Array(12).fill(''),
    OBR: new Array(20).fill('')
  };

  const patientResource = fhirBundle.entry.find(e => e.resource.resourceType === 'Patient').resource;
  const serviceRequestResource = fhirBundle.entry.find(e => e.resource.resourceType === 'ServiceRequest').resource;

  // Populate other HL7 segments based on mapping
  for (const fhirPath in mapping.Bundle) {
    const hl7Field = mapping.Bundle[fhirPath];
    const [segment, fieldIndex] = hl7Field.split('|');

    let fhirValue = getValueFromBundle(fhirBundle, fhirPath);

    // Apply value mappings if available
/*
    if (valueMappings[fhirPath] && valueMappings[fhirPath][fhirValue]) {
      fhirValue = valueMappings[fhirPath][fhirValue];
    }

    console.log(valueMappings[]);
*/
    if (fhirPath.includes('+')) {
      // Handle concatenation for multiple FHIR elements
      const paths = fhirPath.split('+').map(path => path.trim());
      const concatenatedValues = paths.map(path => getValueFromBundle(fhirBundle, path));
      fhirValue = concatenatedValues.filter(Boolean).join(' ').toUpperCase();
    } else {
      // Single FHIR path without concatenation
      fhirValue = getValueFromBundle(fhirBundle, fhirPath);
    }

    console.log(`Mapping FHIR path "${fhirPath}" with value "${fhirValue}" to HL7 segment "${segment}" at field index ${fieldIndex}`);

    if (fhirValue && hl7Segments[segment]) {
      hl7Segments[segment][parseInt(fieldIndex, 10) - 1] = fhirValue;
    }
  }

  return buildHL7Message(hl7Segments);
};

// Other helper functions remain the same...

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
  const mshSegment = `MSH|^~\\&|SendingApp|SendingFacility|ReceivingApp|ReceivingFacility|||${segments.MSH[8]}|||2.3`;
  const pidSegment = `PID|${segments.PID.map(field => field || '').join('|')}`;
  const orcSegment = `ORC|${segments.ORC.map(field => field || '').join('|')}`;
  const obrSegment = `OBR|${segments.OBR.map(field => field || '').join('|')}`;


  const final =
    mshSegment + "\n" + pidSegment + "\n" + orcSegment + "\n" + obrSegment;

  // Join segments with carriage return separators
  //return [pidSegment, orcSegment, obrSegment].join('\r');
  return [final].join("\r");

};

module.exports = { loadMapping, loadValueMappings, convertToHL7v2 };
