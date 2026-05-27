const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { success, error } = require('../utils/response.utils');
const { asyncHandler } = require('../middleware/error.middleware');

exports.myCertificates = asyncHandler(async (req, res) => {
  const certs = await query(
    `SELECT c.cert_number, c.issued_at, e.title AS exam_title, a.percentage, a.score
     FROM certificates c
     JOIN exam_attempts a ON c.attempt_id=a.id
     JOIN exams e ON a.exam_id=e.id
     WHERE c.user_id=? ORDER BY c.issued_at DESC`,
    [req.user.id]
  );
  return success(res, certs);
});

exports.verifyCertificate = asyncHandler(async (req, res) => {
  const certs = await query(
    `SELECT c.cert_number, c.issued_at, u.name AS student_name, e.title AS exam_title, a.percentage
     FROM certificates c
     JOIN users u ON c.user_id=u.id
     JOIN exam_attempts a ON c.attempt_id=a.id
     JOIN exams e ON a.exam_id=e.id
     WHERE c.cert_number=?`,
    [req.params.certNumber]
  );
  if (!certs.length) return error(res, 'Certificate not found or invalid', 404);
  return success(res, { valid: true, ...certs[0] });
});

exports.downloadCertificate = asyncHandler(async (req, res) => {
  const certs = await query(
    `SELECT c.cert_number, c.issued_at, u.name AS student_name,
     e.title AS exam_title, a.percentage, a.score, a.total_marks
     FROM certificates c
     JOIN users u ON c.user_id=u.id
     JOIN exam_attempts a ON c.attempt_id=a.id
     JOIN exams e ON a.exam_id=e.id
     WHERE c.cert_number=? AND c.user_id=?`,
    [req.params.certNumber, req.user.id]
  );
  if (!certs.length) return error(res, 'Certificate not found', 404);
  const cert = certs[0];

  // Generate PDF
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.cert_number}.pdf"`);
  doc.pipe(res);

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0a2540');
  doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#1a6b3c');

  // Header
  doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold')
    .text('GOVERNMENT EXAM PORTAL', 0, 60, { align: 'center' });
  doc.fillColor('#4ade80').fontSize(18)
    .text('Certificate of Achievement', 0, 110, { align: 'center' });

  // Divider
  doc.moveTo(100, 145).lineTo(doc.page.width - 100, 145).strokeColor('#4ade80').lineWidth(2).stroke();

  // Body
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica')
    .text('This is to certify that', 0, 170, { align: 'center' });
  doc.fillColor('#fbbf24').fontSize(28).font('Helvetica-Bold')
    .text(cert.student_name, 0, 195, { align: 'center' });
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica')
    .text('has successfully completed the examination', 0, 240, { align: 'center' });
  doc.fillColor('#60a5fa').fontSize(20).font('Helvetica-Bold')
    .text(cert.exam_title, 0, 265, { align: 'center' });

  doc.fillColor('#ffffff').fontSize(14).font('Helvetica')
    .text(`Score: ${cert.score} / ${cert.total_marks}  |  Percentage: ${cert.percentage}%`, 0, 310, { align: 'center' });

  // Footer
  doc.fillColor('#9ca3af').fontSize(11)
    .text(`Certificate No: ${cert.cert_number}`, 60, 380)
    .text(`Issue Date: ${new Date(cert.issued_at).toLocaleDateString('en-IN')}`, 60, 400)
    .text('Verify at: govexam.in/verify', doc.page.width - 250, 380);

  doc.end();
});
