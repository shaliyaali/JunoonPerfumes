const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const getReportData = async (query_params) => {
    const { search, reportFilter, startDate, endDate } = query_params;
    const filter = reportFilter || 'today';
    const searchQuery = search || '';

    let periodStart, periodEnd;
    const now = new Date();

    if (filter === 'today') {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
    } else if (filter === 'this_week') {
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date();
    } else if (filter === 'this_month') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date();
    } else if (filter === 'this_year') {
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date();
    } else if (filter === 'custom' && startDate && endDate) {
        periodStart = new Date(startDate);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(endDate);
        periodEnd.setHours(23, 59, 59, 999);
    } else {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
    }

    let matchConditions = [];

    // Add date range condition
    matchConditions.push({ orderDate: { $gte: periodStart, $lte: periodEnd } });

    // Exclude cancelled/failed/refunded orders from sales report for accurate revenue
    matchConditions.push({ status: { $nin: ['Cancelled', 'Returned', 'Return Requested'] } });
    matchConditions.push({ paymentStatus: { $nin: ['Failed', 'Refunded'] } });

    if (searchQuery) {
        const userIds = await User.find({ 
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ] 
        }).distinct('_id');

        matchConditions.push({
            $or: [
                { orderId: { $regex: searchQuery, $options: 'i' } },
                { user: { $in: userIds } }
            ]
        });
    }

    // Combine all conditions with $and
    const finalQuery = matchConditions.length > 0 ? { $and: matchConditions } : {};

    return { query: finalQuery, periodStart, periodEnd };
};

const loadSalesReport = async (req, res, next) => {
    try {
        const { search, reportFilter, startDate, endDate, page } = req.query;
        const currentPage = parseInt(page) || 1;
        const limit = 10;
        const skip = (currentPage - 1) * limit;

        const { query, periodStart, periodEnd } = await getReportData(req.query);

        // Fetch orders for the table
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);
        
        const totalOrdersCount = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrdersCount / limit);

        // Calculate summary totals using aggregation
        const summary = await Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalOrdersCount: { $sum: 1 },
                    totalSalesAmount: { $sum: "$totalAmount" },
                    totalDiscount: { $sum: "$couponDiscount" }
                }
            }
        ]);

        const totalData = summary[0] || { totalOrdersCount: 0, totalSalesAmount: 0, totalDiscount: 0 };

        res.render('reports', {
            orders, // Keep orders for the table
            search: search || '', // Keep search for input value
            reportFilter: reportFilter || 'today', // Keep filter for select value
            startDate: startDate || '', // Keep start date for input value
            endDate: endDate || '', // Keep end date for input value
            currentPage,
            totalPages,
            activePage: 'reports'
        });

    } catch (error) {
        console.error('Error loading sales report:', error);
        next(error);
    }
};

const exportPDF = async (req, res, next) => {
    try {
        const { query, periodStart, periodEnd } = await getReportData(req.query);
        const orders = await Order.find(query).populate('user', 'name email').sort({ orderDate: -1 });

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Junoon Perfumes - Sales Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Generated On: ${new Date().toLocaleString()}`);
        doc.text(`Report Period: ${periodStart.toLocaleDateString('en-GB')} - ${periodEnd.toLocaleDateString('en-GB')}`);
        doc.moveDown();

        // Table Header
        const startY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Order ID', 50, startY);
        doc.text('Date', 150, startY);
        doc.text('Customer', 220, startY);
        doc.text('Method', 350, startY);
        doc.text('Total', 480, startY, { align: 'right' });
        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();

        // Rows
        let currentY = startY + 25;
        doc.font('Helvetica').fontSize(9);
        orders.forEach(order => {
            if (currentY > 750) { doc.addPage(); currentY = 50; }
            doc.text(`#${order.orderId}`, 50, currentY);
            doc.text(new Date(order.orderDate).toLocaleDateString('en-GB'), 150, currentY);
            doc.text(order.user ? order.user.name : 'Guest', 220, currentY);
            doc.text(order.paymentMethod, 350, currentY);
            doc.text(`INR ${order.totalAmount.toLocaleString()}`, 480, currentY, { align: 'right' });
            currentY += 20;
        });

        doc.end();
    } catch (error) { next(error); }
};

const exportExcel = async (req, res, next) => {
    try {
        const { query, periodStart, periodEnd } = await getReportData(req.query);
        const orders = await Order.find(query).populate('user', 'name email').sort({ orderDate: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Report Info
        worksheet.addRow(['Junoon Perfumes - Sales Report']).font = { bold: true, size: 16 };
        worksheet.addRow([`Period: ${periodStart.toLocaleDateString('en-GB')} - ${periodEnd.toLocaleDateString('en-GB')}`]);
        worksheet.addRow([`Generated On: ${new Date().toLocaleString()}`]);
        worksheet.addRow([]);

        // Table Header
        const headerRow = worksheet.addRow(['Order ID', 'Date', 'Customer', 'Payment Method', 'Total Amount']);
        headerRow.font = { bold: true };

        orders.forEach(order => {
            worksheet.addRow([
                `#${order.orderId}`,
                new Date(order.orderDate).toLocaleDateString('en-GB'),
                order.user ? order.user.name : 'Guest',
                order.paymentMethod,
                order.totalAmount
            ]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) { next(error); }
};

module.exports = {
    loadSalesReport,
    exportPDF,
    exportExcel
};
