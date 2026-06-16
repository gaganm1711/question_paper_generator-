const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    try {
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Usage: node render_pdf.js <input_html_path> <output_pdf_path>');
            process.exit(1);
        }
        
        const inputHtmlPath = path.resolve(args[0]);
        const outputPdfPath = path.resolve(args[1]);

        console.log(`Launching Puppeteer to render ${inputHtmlPath} into ${outputPdfPath}...`);
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();
        
        // Go to file URL
        const fileUrl = `file://${inputHtmlPath}`;
        await page.goto(fileUrl, { waitUntil: 'networkidle0' });
        
        // Generate printable A4 PDF
        await page.pdf({
            path: outputPdfPath,
            format: 'A4',
            landscape: true,
            margin: {
                top: '0mm',
                bottom: '0mm',
                left: '0mm',
                right: '0mm'
            },
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: false
        });

        await browser.close();
        console.log('PDF rendered successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error generating PDF:', err);
        process.exit(1);
    }
})();
