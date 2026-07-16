import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface QrPdfVendor {
  id: string;
  name: string;
  boothNumber: string | null;
  zone: string | null;
  qrCodePayload: string;
}

export async function buildVendorQrPdf(
  eventName: string,
  vendors: QrPdfVendor[],
): Promise<Buffer> {
  const qrImages = await Promise.all(
    vendors.map((vendor) =>
      QRCode.toBuffer(vendor.qrCodePayload, {
        type: 'png',
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
      }),
    ),
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    vendors.forEach((vendor, index) => {
      doc.addPage({ size: 'A4', margin: 48 });
      const pageWidth = doc.page.width;
      const centerX = pageWidth / 2;

      doc.fontSize(20).text(eventName, 48, 60, {
        width: pageWidth - 96,
        align: 'center',
      });
      doc.moveDown(0.5);
      doc.fontSize(16).text(vendor.name, { align: 'center' });
      doc.moveDown(0.25);
      doc
        .fontSize(13)
        .fillColor('#344054')
        .text(`Booth: ${vendor.boothNumber ?? 'Unassigned'}`, { align: 'center' });
      if (vendor.zone) {
        doc.text(`Zone: ${vendor.zone}`, { align: 'center' });
      }

      const imageSize = 220;
      const imageX = centerX - imageSize / 2;
      doc.image(qrImages[index], imageX, 220, {
        width: imageSize,
        height: imageSize,
      });

      doc
        .fontSize(9)
        .fillColor('#667085')
        .text(vendor.qrCodePayload, 48, 470, {
          width: pageWidth - 96,
          align: 'center',
          lineBreak: true,
        });

      doc
        .fontSize(10)
        .fillColor('#1f4a37')
        .text('Scan to open vendor in Festive Vendor Locator', 48, 540, {
          width: pageWidth - 96,
          align: 'center',
        });
    });

    doc.end();
  });
}
