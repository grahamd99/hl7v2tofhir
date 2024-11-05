// app.js
const { loadMapping, convertToHL7v2 } = require("./convert");
const path = require("path");
const fs = require("fs");

// Main function to perform conversion
const main = () => {
  const filePath = path.resolve(
    __dirname,
    "./public/FhirServiceRequestMammo.json"
  );
  const mapping = loadMapping();
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    const serviceRequest = JSON.parse(data);
    //console.log(data);

    const hl7Message = convertToHL7v2(serviceRequest, mapping);

    console.log("Generated HL7 ORM Message:");
    console.log(hl7Message);
  });
};

main();
