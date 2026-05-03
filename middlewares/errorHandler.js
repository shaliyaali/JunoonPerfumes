const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // 1. Log the error for the developer (in a real app, use a logger like Winston)
    console.error(`[ERROR] ${req.method} ${req.url}: ${err.stack}`);

    // 2. Check if the request is an AJAX/API request
    // We check the 'X-Requested-With' header or the 'Accept' header
    const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));

    if (isAjax) {
        return res.status(statusCode).json({
            success: false,
            message: message,
            // Only send stack trace in development mode
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }

    // 3. Handle regular page loads
    if (statusCode === 404) {
        return res.status(404).render('page404', { session: req.session });
    }

    res.status(statusCode).render('account/error', { 
        message, 
        error: process.env.NODE_ENV === 'development' ? err : {} 
    });
};

module.exports = errorHandler;