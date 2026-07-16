import PDFDocument from 'pdfkit';

export interface DashboardPdfData {
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  generatedAt: string;
  dau: number;
  activeUsers: number;
  totalSearches: number;
  navigationStarts: number;
  qrScans: number;
  topVendors: Array<{ name: string; views: number }>;
  dailyTrend: Array<{
    date: string;
    activeUsers: number;
    searches: number;
    navigationStarts: number;
    qrScans: number;
  }>;
  comparison?: {
    eventName: string;
    dau: number;
    activeUsers: number;
    totalSearches: number;
    navigationStarts: number;
    qrScans: number;
  } | null;
}

export async function buildDashboardPdf(
  data: DashboardPdfData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).text('Event Engagement Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text(data.eventName, { align: 'center' });
    doc
      .fontSize(10)
      .fillColor('#667085')
      .text(
        `${data.eventStartDate} to ${data.eventEndDate} · Generated ${new Date(data.generatedAt).toLocaleString()}`,
        { align: 'center' },
      );
    doc.moveDown(1.2);
    doc.fillColor('#000000');

    doc.fontSize(14).text('Key Metrics (24h rolling)');
    doc.moveDown(0.4);
    const metrics = [
      ['DAU (today)', String(data.dau)],
      ['Active users (24h)', String(data.activeUsers)],
      ['Searches (24h)', String(data.totalSearches)],
      ['Navigation starts (24h)', String(data.navigationStarts)],
      ['QR scans (24h)', String(data.qrScans)],
    ];
    metrics.forEach(([label, value]) => {
      doc.fontSize(11).text(`${label}: ${value}`);
    });

    if (data.comparison) {
      doc.moveDown(0.8);
      doc.fontSize(14).text(`Comparison: ${data.comparison.eventName}`);
      doc.moveDown(0.4);
      const compareMetrics = [
        ['DAU', String(data.comparison.dau)],
        ['Active users (24h)', String(data.comparison.activeUsers)],
        ['Searches (24h)', String(data.comparison.totalSearches)],
        ['Navigation starts (24h)', String(data.comparison.navigationStarts)],
        ['QR scans (24h)', String(data.comparison.qrScans)],
      ];
      compareMetrics.forEach(([label, value]) => {
        doc.fontSize(11).text(`${label}: ${value}`);
      });
    }

    doc.moveDown(0.8);
    doc.fontSize(14).text('Top Vendors');
    doc.moveDown(0.3);
    if (!data.topVendors.length) {
      doc.fontSize(11).text('No vendor views recorded yet.');
    } else {
      data.topVendors.forEach((vendor, index) => {
        doc
          .fontSize(11)
          .text(`${index + 1}. ${vendor.name} — ${vendor.views} views`);
      });
    }

    doc.moveDown(0.8);
    doc.fontSize(14).text('Daily Engagement Trend');
    doc.moveDown(0.3);
    data.dailyTrend.forEach((day) => {
      doc
        .fontSize(10)
        .text(
          `${day.date}: ${day.activeUsers} users, ${day.searches} searches, ${day.navigationStarts} navigations, ${day.qrScans} QR scans`,
        );
    });

    doc.end();
  });
}
