const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\Users\\Shruthi\\Downloads\\revere-city-insights-main\\FY2025-Budget_GFOA_FINAL.pdf';
const outputPath = 'C:\\Users\\Shruthi\\Downloads\\revere-city-insights-main\\FY2025-Budget.md';

async function convertPDF() {
  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync(pdfPath);

  console.log('Parsing PDF...');
  const data = await pdf(dataBuffer);

  console.log(`Extracted ${data.numpages} pages`);
  console.log(`Total text length: ${data.text.length} characters`);

  // Write to markdown file
  fs.writeFileSync(outputPath, data.text);
  console.log(`✅ Saved to ${outputPath}`);
}

convertPDF().catch(console.error);
