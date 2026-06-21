// Add this function to authMiddleware.js after line 500 (after the canViewProgress function ends)
// Insert it BEFORE the console.log('authMiddleware exports:', { line

// NEW: Check for service manager (manager with specific service)
const isServiceManager = (req, res, next) => {
    if (!req.user || req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Manager role required.'
        });
    }

    const requiredService = req.body.service || req.params.service || req.query.service;
    const userService = (req.user.service || '').trim();

    if (requiredService && userService !== requiredService) {
        console.warn(`[${new Date().toISOString()}] isServiceManager denied: service mismatch "${userService}" vs "${requiredService}" for user ${req.user.id}`);
        return res.status(403).json({
            success: false,
            message: `Access denied. Only ${requiredService} managers can access this resource.`
        });
    }

    console.log(`[${new Date().toISOString()}] isServiceManager passed for user ${req.user.id} with service ${userService}`);
    next();
};
